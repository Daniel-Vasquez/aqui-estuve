import type { APIRoute } from 'astro';
import { z } from 'zod';
import { MongoServerError } from 'mongodb';
import { json, jsonError } from '@/lib/http';
import { FOLDER, MAX_BYTES, destroyImage, getImage } from '@/lib/cloudinary';
import { photoCreateSchema } from '@/lib/photos/schema';
import { createPhoto, findByPublicId, listPhotos } from '@/lib/photos/repository';
import { toDTO } from '@/lib/photos/types';
import { getClientIp, hashIp, likedSet } from '@/lib/likes';

export const GET: APIRoute = async (ctx) => {
  const limit = Number(ctx.url.searchParams.get('limit') ?? 24) || 24;
  const cursor = ctx.url.searchParams.get('cursor');
  const { photos, nextCursor } = await listPhotos({ limit, cursor });
  const ip = getClientIp(ctx);
  const liked = ip ? await likedSet(hashIp(ip), photos.map((p) => p._id)) : new Set<string>();
  return json({ photos: photos.map((p) => toDTO(p, liked.has(p._id.toHexString()))), nextCursor });
};

// Protegido por middleware (solo admin). La imagen YA está en Cloudinary (subida directa).
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'JSON inválido'); }

  const parsed = photoCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Datos inválidos', z.flattenError(parsed.error));
  const { publicId } = parsed.data;

  // Solo se aceptan recursos de nuestra carpeta (evita registrar imágenes ajenas de la cuenta).
  if (!publicId.startsWith(`${FOLDER}/`)) return jsonError(400, 'publicId fuera de la carpeta permitida');
  if (await findByPublicId(publicId)) return jsonError(409, 'Esa imagen ya está publicada');

  let image;
  try {
    image = await getImage(publicId);
  } catch (err) {
    console.error('[photos:verify]', err);
    return jsonError(502, 'No se pudo verificar la imagen en Cloudinary');
  }
  if (!image) return jsonError(400, 'La imagen no existe en Cloudinary');

  if (image.bytes > MAX_BYTES) {
    await destroyImage(publicId).catch(() => {});
    return jsonError(413, `La imagen supera ${MAX_BYTES / 1024 / 1024} MB`);
  }

  try {
    const photo = await createPhoto(parsed.data, image);
    return json({ photo: toDTO(photo) }, 201);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      return jsonError(409, 'Esa imagen ya está publicada');   // carrera con el índice único de publicId
    }
    // Compensación: no dejar imágenes huérfanas en Cloudinary.
    await destroyImage(publicId).catch(() => {});
    console.error('[photos:create]', err);
    return jsonError(500, 'No se pudo guardar la publicación');
  }
};
