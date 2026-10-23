import type { APIRoute } from 'astro';
import { z } from 'zod';
import { json, jsonError } from '@/lib/http';
import { destroyImage } from '@/lib/cloudinary';
import { photoUpdateSchema } from '@/lib/photos/schema';
import { deletePhotoDoc, getPhoto, parseObjectId, updatePhoto } from '@/lib/photos/repository';
import { toDTO } from '@/lib/photos/types';

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

  const updated = await updatePhoto(id, parsed.data);
  return updated ? json({ photo: toDTO(updated) }) : jsonError(404, 'No encontrada');
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseObjectId(params.id);
  if (!id) return jsonError(400, 'ID inválido');

  const photo = await getPhoto(id);
  if (!photo) return jsonError(404, 'No encontrada');

  // 1) Cloudinary primero: si falla, la publicación se conserva y se puede reintentar.
  const destroyed = await destroyImage(photo.publicId).catch((err) => {
    console.error('[photos:destroy]', err);
    return false;
  });
  if (!destroyed) return jsonError(502, 'No se pudo eliminar la imagen en Cloudinary');

  // 2) MongoDB (documento + likes asociados).
  await deletePhotoDoc(id);
  return json({ ok: true });
};
