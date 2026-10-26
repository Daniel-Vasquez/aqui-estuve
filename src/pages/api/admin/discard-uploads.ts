import type { APIRoute } from 'astro';
import { z } from 'zod';
import { json, jsonError } from '@/lib/http';
import { MAX_IMAGES_PER_POST } from '@/lib/photos/types';
import { discardUploads } from '@/lib/photos/images-service';

const bodySchema = z.object({ publicIds: z.array(z.string().min(1).max(255)).max(MAX_IMAGES_PER_POST) });

// Protegido por middleware (/api/admin/* + POST). Lo llama el admin si falla el guardado tras subir.
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'JSON inválido'); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Datos inválidos', z.flattenError(parsed.error));
  return json({ discarded: await discardUploads(parsed.data.publicIds) });
};
