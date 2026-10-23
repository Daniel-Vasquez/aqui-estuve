import type { APIRoute } from 'astro';
import { pingDb } from '@/lib/db';
import { json, jsonError } from '@/lib/http';

export const GET: APIRoute = async () => {
  try {
    await pingDb();
    return json({ ok: true, db: 'up' });
  } catch (err) {
    console.error('[health]', err);
    return jsonError(503, 'Base de datos no disponible');
  }
};
