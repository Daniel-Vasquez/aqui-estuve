import type { APIRoute } from 'astro';
import { z } from 'zod';
import { MongoServerError } from 'mongodb';
import { json, jsonError } from '@/lib/http';
import { photoCreateSchema } from '@/lib/photos/schema';
import { createPhoto, isPhotoDevice, listPhotos } from '@/lib/photos/repository';
import { destroyImages, verifyNewImages } from '@/lib/photos/images-service';
import { toDTO } from '@/lib/photos/types';
import { getClientIp, hashIp, likedSet } from '@/lib/likes';
import { resolveCategories } from '@/lib/photos/category-repository';
import { ALL_CATEGORIES_LABEL, sameCategory } from '@/lib/photos/categories';

export const GET: APIRoute = async (ctx) => {
  const limit = Number(ctx.url.searchParams.get('limit') ?? 24) || 24;
  const cursor = ctx.url.searchParams.get('cursor');
  // ?category=Paisaje filtra; ausente o "Todas" → todas.
  const rawCategory = ctx.url.searchParams.get('category')?.trim();
  const category = rawCategory && !sameCategory(rawCategory, ALL_CATEGORIES_LABEL) ? rawCategory : null;
  // ?device=iphone|camera filtra; ausente o desconocido → todos. Ambos params se combinan (AND).
  const rawDevice = ctx.url.searchParams.get('device');
  const device = isPhotoDevice(rawDevice) ? rawDevice : null;
  const { photos, nextCursor } = await listPhotos({ limit, cursor, category, device });
  const ip = getClientIp(ctx);
  const liked = ip ? await likedSet(hashIp(ip), photos.map((p) => p._id)) : new Set<string>();
  return json({ photos: photos.map((p) => toDTO(p, liked.has(p._id.toHexString()))), nextCursor });
};

// Protegido por middleware (solo admin). Las imágenes (1–5) YA están en Cloudinary (subida directa en paralelo).
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'JSON inválido'); }

  const parsed = photoCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Datos inválidos', z.flattenError(parsed.error));
  const { publicIds, ...meta } = parsed.data;

  const check = await verifyNewImages(publicIds);
  if (!check.ok) return jsonError(check.status, check.error);

  try {
    // Al final: las categorías nuevas solo se registran si la publicación es válida.
    meta.categories = await resolveCategories(meta.categories);
    const photo = await createPhoto(meta, check.images);
    return json({ photo: toDTO(photo) }, 201);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      // Carrera: otra publicación registró esas imágenes primero (son suyas, no se destruyen).
      return jsonError(409, 'Alguna imagen ya está publicada');
    }
    // Compensación: no dejar imágenes huérfanas en Cloudinary.
    await destroyImages(publicIds);
    console.error('[photos:create]', err);
    return jsonError(500, 'No se pudo guardar la publicación');
  }
};
