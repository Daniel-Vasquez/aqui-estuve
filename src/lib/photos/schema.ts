import { z } from 'zod';
import { PHOTO_DEVICES } from './types';

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

const base = {
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(5000),
  tags,
  hashtags,
  location: locationSchema.nullable(),
  device: z.enum(PHOTO_DEVICES).nullable(),
  createdAt: z.coerce.date(),
};

export const photoCreateSchema = z.object({
  publicId: z.string().trim().min(1).max(255),  // devuelto por Cloudinary tras la subida directa
  title: base.title,
  description: base.description.default(''),
  tags: base.tags.default([]),
  hashtags: base.hashtags.default([]),
  location: base.location.default(null),
  device: base.device.default(null),           // no obligatorio
  createdAt: base.createdAt.optional(),        // si falta → ahora
});

export const photoUpdateSchema = z
  .object(base)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nada que actualizar' });

export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>;
