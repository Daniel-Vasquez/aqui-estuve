import type { ObjectId } from 'mongodb';
import { FOLDER, MAX_BYTES, destroyImage, getImage, type CloudinaryImage } from '../cloudinary';
import { findUsedPublicIds } from './repository';
import type { PhotoAsset } from './types';

const toAsset = (img: CloudinaryImage): PhotoAsset => ({
  imageUrl: img.secure_url,
  publicId: img.public_id,
  width: img.width,
  height: img.height,
  format: img.format,
  bytes: img.bytes,
});

export type ImagesCheck = { ok: true; images: PhotoAsset[] } | { ok: false; status: number; error: string };

/**
 * Verifica imágenes RECIÉN subidas (navegador → Cloudinary) antes de asociarlas a una publicación.
 * Los datos (dimensiones, peso) salen de Cloudinary, no del cliente. Consultas en paralelo.
 * Si alguna no es válida, se destruyen las nuevas que sí existen (no las usa nadie) para no dejar huérfanas.
 */
export async function verifyNewImages(ids: string[], exclude?: ObjectId): Promise<ImagesCheck> {
  if (!ids.length) return { ok: true, images: [] };

  // Solo nuestra carpeta: evita registrar (o borrar) imágenes ajenas de la cuenta.
  if (ids.some((id) => !id.startsWith(`${FOLDER}/`))) {
    return { ok: false, status: 400, error: 'Imagen fuera de la carpeta permitida' };
  }
  if ((await findUsedPublicIds(ids, exclude)).size) {
    return { ok: false, status: 409, error: 'Alguna imagen ya está publicada' };
  }

  let found: (CloudinaryImage | null)[];
  try {
    found = await Promise.all(ids.map((id) => getImage(id)));
  } catch (err) {
    console.error('[images:verify]', err);
    return { ok: false, status: 502, error: 'No se pudieron verificar las imágenes en Cloudinary' };
  }

  const existing = found.filter((img): img is CloudinaryImage => img !== null);
  if (existing.length !== ids.length) {
    await destroyImages(existing.map((i) => i.public_id));
    return { ok: false, status: 400, error: 'Alguna imagen no existe en Cloudinary' };
  }
  if (existing.some((img) => img.bytes > MAX_BYTES)) {
    await destroyImages(ids);
    return { ok: false, status: 413, error: `Alguna imagen supera ${MAX_BYTES / 1024 / 1024} MB` };
  }
  return { ok: true, images: existing.map(toAsset) };
}

/** Destruye varias imágenes en paralelo. true si todas quedaron eliminadas (o ya no existían). */
export async function destroyImages(ids: string[]): Promise<boolean> {
  const results = await Promise.allSettled(ids.map((id) => destroyImage(id)));
  results.forEach((r, i) => r.status === 'rejected' && console.error('[images:destroy]', ids[i], r.reason));
  return results.every((r) => r.status === 'fulfilled' && r.value);
}

/** Descarta subidas abandonadas: solo de nuestra carpeta y que no use ninguna publicación. */
export async function discardUploads(ids: string[]): Promise<number> {
  const ours = ids.filter((id) => id.startsWith(`${FOLDER}/`));
  const used = await findUsedPublicIds(ours);
  const orphans = ours.filter((id) => !used.has(id));
  await destroyImages(orphans);
  return orphans.length;
}
