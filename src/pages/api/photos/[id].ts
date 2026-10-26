import type { APIRoute } from 'astro';
import { z } from 'zod';
import { json, jsonError } from '@/lib/http';
import { photoUpdateSchema } from '@/lib/photos/schema';
import { deletePhotoDoc, getPhoto, parseObjectId, updatePhoto } from '@/lib/photos/repository';
import { photoImages, toDTO, type PhotoAsset } from '@/lib/photos/types';
import { destroyImages, verifyNewImages } from '@/lib/photos/images-service';
import { resolveCategories } from '@/lib/photos/category-repository';

export const GET: APIRoute = async ({ params }) => {
  const id = parseObjectId(params.id);
  if (!id) return jsonError(400, 'ID inválido');
  const photo = await getPhoto(id);
  return photo ? json({ photo: toDTO(photo) }) : jsonError(404, 'No encontrada');
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseObjectId(params.id);
  if (!id) return jsonError(400, 'ID inválido');

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'JSON inválido'); }

  const parsed = photoUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Datos inválidos', z.flattenError(parsed.error));
  const { publicIds, ...meta } = parsed.data;

  // Imágenes: publicIds = lista final ordenada (conservadas + nuevas). Ausente → no se tocan.
  let images: PhotoAsset[] | undefined;
  let added: string[] = [];
  let removed: string[] = [];
  if (publicIds) {
    const current = await getPhoto(id);
    if (!current) return jsonError(404, 'No encontrada');
    const currentImages = photoImages(current);
    const byId = new Map(currentImages.map((img) => [img.publicId, img]));

    added = publicIds.filter((p) => !byId.has(p));
    const check = await verifyNewImages(added, id);
    if (!check.ok) return jsonError(check.status, check.error);
    const addedById = new Map(check.images.map((img) => [img.publicId, img]));

    images = publicIds.map((p) => byId.get(p) ?? addedById.get(p)!);
    removed = currentImages.map((img) => img.publicId).filter((p) => !publicIds.includes(p));
  }

  if (meta.categories) meta.categories = await resolveCategories(meta.categories);

  let updated;
  try {
    updated = await updatePhoto(id, meta, images);
  } catch (err) {
    await destroyImages(added);            // las nuevas no llegaron a asociarse
    throw err;
  }
  if (!updated) {
    await destroyImages(added);
    return jsonError(404, 'No encontrada');
  }

  // Solo DESPUÉS de guardar se destruyen las quitadas (si falla, quedan huérfanas pero la publicación es correcta).
  if (removed.length && !(await destroyImages(removed))) {
    console.error('[photos:update] no se pudieron destruir', removed);
  }
  return json({ photo: toDTO(updated) });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseObjectId(params.id);
  if (!id) return jsonError(400, 'ID inválido');

  const photo = await getPhoto(id);
  if (!photo) return jsonError(404, 'No encontrada');

  // 1) Cloudinary primero (todas las imágenes): si alguna falla, la publicación se conserva y se puede
  //    reintentar; las ya destruidas devolverán "not found", que cuenta como éxito.
  const destroyed = await destroyImages(photoImages(photo).map((img) => img.publicId));
  if (!destroyed) return jsonError(502, 'No se pudieron eliminar las imágenes en Cloudinary');

  // 2) MongoDB (documento + likes asociados).
  await deletePhotoDoc(id);
  return json({ ok: true });
};
