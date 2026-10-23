import type { APIRoute } from 'astro';
import { json, jsonError } from '@/lib/http';
import { getClientIp, hashIp, toggleLike } from '@/lib/likes';
import { getPhoto, parseObjectId } from '@/lib/photos/repository';

export const POST: APIRoute = async (ctx) => {
  const id = parseObjectId(ctx.params.id);
  if (!id) return jsonError(400, 'ID inválido');

  const ip = getClientIp(ctx);
  if (!ip) return jsonError(400, 'No se pudo identificar el dispositivo');

  if (!(await getPhoto(id))) return jsonError(404, 'No encontrada');

  const result = await toggleLike(id, hashIp(ip));
  return json(result);
};
