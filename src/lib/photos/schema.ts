import { z } from 'zod';
import { MAX_IMAGES_PER_POST, PHOTO_DEVICES } from './types';
import {
  ALL_CATEGORIES_LABEL,
  CATEGORY_MAX_LENGTH,
  MAX_CATEGORIES_PER_PHOTO,
  dedupeCategories,
  sameCategory,
} from './categories';

const dedupe = (arr: string[]) => [...new Set(arr)];

const tags = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((arr) => dedupe(arr.map((t) => t.toLowerCase())));

const hashtags = z
  .array(z.string())
  .max(30)
  .transform((arr) =>
    dedupe(
      arr
        .map((h) => h.trim().replace(/^#+/, '').toLowerCase())
        .filter((h) => /^[\p{L}\p{N}_]{1,50}$/u.test(h)),
    ),
  );

export const locationSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    mapsUrl: z
      .url()
      .max(2048)
      .refine((u) => /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/.test(u), {
        message: 'Debe ser un enlace de Google Maps',
      })
      .optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .refine((l) => (l.lat === undefined) === (l.lng === undefined), {
    message: 'lat y lng deben indicarse juntas',
  });

// Lista ORDENADA de public_ids (la primera es la portada), sin duplicados, 1–5.
const publicIds = z
  .array(z.string().trim().min(1).max(255))
  .transform((ids) => [...new Set(ids)])
  .pipe(
    z
      .array(z.string())
      .min(1, { message: 'Sube al menos una foto' })
      .max(MAX_IMAGES_PER_POST, { message: `Máximo ${MAX_IMAGES_PER_POST} fotos por publicación` }),
  );

const base = {
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(5000),
  tags,
  hashtags,
  location: locationSchema.nullable(),
  device: z.enum(PHOTO_DEVICES).nullable(),
  // Se limpian vacíos/duplicados ANTES de contar: ["Paisaje", " paisaje ", ""] → ["Paisaje"].
  categories: z
    .array(z.string())
    .transform(dedupeCategories)
    .pipe(
      z
        .array(
          z
            .string()
            .max(CATEGORY_MAX_LENGTH)
            .refine((c) => !sameCategory(c, ALL_CATEGORIES_LABEL), { message: `"${ALL_CATEGORIES_LABEL}" es un nombre reservado` }),
        )
        .min(1, { message: 'Elige al menos una categoría' })
        .max(MAX_CATEGORIES_PER_PHOTO, { message: `Máximo ${MAX_CATEGORIES_PER_PHOTO} categorías` }),
    ),
  createdAt: z.coerce.date(),
};

export const photoCreateSchema = z.object({
  publicIds,                                   // devueltos por Cloudinary tras la subida directa
  title: base.title,
  description: base.description.default(''),
  tags: base.tags.default([]),
  hashtags: base.hashtags.default([]),
  location: base.location.default(null),
  device: base.device.default(null),           // no obligatorio
  categories: base.categories,                 // obligatorio (1–3); se resuelven/crean en el endpoint
  createdAt: base.createdAt.optional(),        // si falta → ahora
});

// En edición, `publicIds` (opcional) es la lista final: conservadas + nuevas, en orden.
export const photoUpdateSchema = z
  .object({ ...base, publicIds })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nada que actualizar' });

export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>;
/** Metadatos sin la lista de imágenes (las imágenes se resuelven aparte). */
export type PhotoCreateMeta = Omit<PhotoCreateInput, 'publicIds'>;
export type PhotoUpdateMeta = Omit<PhotoUpdateInput, 'publicIds'>;
