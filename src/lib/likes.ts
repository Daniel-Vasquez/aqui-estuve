import { createHmac } from 'node:crypto';
import { MongoServerError, type ObjectId } from 'mongodb';
import type { APIContext } from 'astro';
import { db } from './db';
import { env } from './env';
import { photosCol } from './photos/repository';

interface LikeDoc { photoId: ObjectId; ipHash: string; createdAt: Date }
const likesCol = () => db.collection<LikeDoc>('likes');

const SALT = env('LIKES_IP_SALT');
const TRUST_PROXY = env('TRUST_PROXY', 'false') === 'true';

/** IP del cliente. Solo se confía en X-Forwarded-For si TRUST_PROXY=true. */
export function getClientIp(ctx: Pick<APIContext, 'request' | 'clientAddress'>): string | null {
  let ip: string | null = null;
  if (TRUST_PROXY) {
    ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || ctx.request.headers.get('x-real-ip')?.trim()
      || null;
  }
  if (!ip) {
    try { ip = ctx.clientAddress; } catch { ip = null; }   // algunos entornos lanzan si no hay IP
  }
  return ip ? ip.replace(/^::ffff:/, '') : null;           // IPv4 mapeada en IPv6
}

/** HMAC-SHA256(salt, ip) en hex: no reversible sin la sal, la IP nunca se guarda. */
export const hashIp = (ip: string) => createHmac('sha256', SALT).update(ip).digest('hex');

/** Alterna el like. Devuelve el estado final y el contador actualizado. */
export async function toggleLike(photoId: ObjectId, ipHash: string) {
  try {
    await likesCol().insertOne({ photoId, ipHash, createdAt: new Date() });
    const doc = await photosCol().findOneAndUpdate(
      { _id: photoId }, { $inc: { likesCount: 1 } }, { returnDocument: 'after', projection: { likesCount: 1 } },
    );
    return { liked: true, likesCount: doc?.likesCount ?? 0 };
  } catch (err) {
    // 11000 = clave duplicada → ya había like de este hash → se quita.
    if (!(err instanceof MongoServerError && err.code === 11000)) throw err;
    const { deletedCount } = await likesCol().deleteOne({ photoId, ipHash });
    // Sin condición ($gt: 0): cada alta suma 1 y cada baja resta 1, así el valor final
    // siempre coincide con los documentos de `likes` aunque las peticiones se crucen.
    // Un instante puede quedar en -1; la respuesta se acota a 0.
    const doc = deletedCount
      ? await photosCol().findOneAndUpdate(
          { _id: photoId }, { $inc: { likesCount: -1 } },
          { returnDocument: 'after', projection: { likesCount: 1 } },
        )
      : await photosCol().findOne({ _id: photoId }, { projection: { likesCount: 1 } });
    return { liked: false, likesCount: Math.max(0, doc?.likesCount ?? 0) };
  }
}

/** Qué fotos de la lista ya tienen like de este visitante (para pintar el estado inicial). */
export async function likedSet(ipHash: string, photoIds: ObjectId[]): Promise<Set<string>> {
  if (!photoIds.length) return new Set();
  const rows = await likesCol()
    .find({ ipHash, photoId: { $in: photoIds } }, { projection: { photoId: 1 } })
    .toArray();
  return new Set(rows.map((r) => r.photoId.toHexString()));
}
