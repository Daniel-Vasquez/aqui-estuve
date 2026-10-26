import { ObjectId, type Filter } from 'mongodb';
import { db } from '../db';
import { slugify } from '../slug';
import { PHOTO_DEVICES, type PhotoAsset, type PhotoDevice, type PhotoDoc } from './types';
import type { PhotoCreateMeta, PhotoUpdateMeta } from './schema';

export const photosCol = () => db.collection<PhotoDoc>('photos');

export function parseObjectId(id: string | undefined): ObjectId | null {
  return id && ObjectId.isValid(id) && /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

const buildSlug = (title: string, id: ObjectId) =>
  `${slugify(title) || 'foto'}-${id.toHexString().slice(-6)}`;

export async function listPhotos({ limit = 24, cursor, category, device }: {
  limit?: number;
  cursor?: string | null;
  category?: string | null;      // null/undefined = todas
  device?: PhotoDevice | null;   // null/undefined = todos
}) {
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  // Condiciones combinadas con $and: el filtro de categoría y el cursor usan $or cada uno.
  const conditions: Filter<PhotoDoc>[] = [];
  // Array nuevo `categories` + campo antiguo `category` (publicaciones previas).
  if (category) conditions.push({ $or: [{ categories: category }, { category }] });
  if (device) conditions.push({ device });

  if (cursor) {
    const cursorId = parseObjectId(cursor);
    const ref = cursorId ? await photosCol().findOne({ _id: cursorId }, { projection: { createdAt: 1 } }) : null;
    if (ref) {
      conditions.push({
        $or: [
          { createdAt: { $lt: ref.createdAt } },
          { createdAt: ref.createdAt, _id: { $lt: ref._id } },
        ],
      });
    }
  }
  const filter: Filter<PhotoDoc> = conditions.length ? { $and: conditions } : {};

  const docs = await photosCol()
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(safeLimit + 1)
    .toArray();

  const hasMore = docs.length > safeLimit;
  const page = hasMore ? docs.slice(0, safeLimit) : docs;
  return { photos: page, nextCursor: hasMore ? page[page.length - 1]._id.toHexString() : null };
}

/** Dispositivos que aparecen en al menos una publicación, en el orden del sistema (iPhone, Cámara). */
export async function listDevices(): Promise<PhotoDevice[]> {
  const used = new Set(await photosCol().distinct('device'));
  return PHOTO_DEVICES.filter((d) => used.has(d));
}

export const isPhotoDevice = (v: unknown): v is PhotoDevice =>
  typeof v === 'string' && (PHOTO_DEVICES as readonly string[]).includes(v);

export const getPhoto = (id: ObjectId) => photosCol().findOne({ _id: id });

/** public_ids de la lista que ya pertenecen a alguna publicación (opcionalmente excluyendo una). */
export async function findUsedPublicIds(ids: string[], exclude?: ObjectId): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const docs = await photosCol()
    .find(
      { $or: [{ publicId: { $in: ids } }, { 'images.publicId': { $in: ids } }], ...(exclude ? { _id: { $ne: exclude } } : {}) },
      { projection: { publicId: 1, images: 1 } },
    )
    .toArray();
  const wanted = new Set(ids);
  return new Set(docs.flatMap((d) => [d.publicId, ...(d.images ?? []).map((i) => i.publicId)]).filter((p) => wanted.has(p)));
}

/** Campos raíz de portada a partir de images[0] (compatibilidad con código y documentos antiguos). */
const coverFields = (images: PhotoAsset[]) => {
  const c = images[0];
  return { imageUrl: c.imageUrl, publicId: c.publicId, width: c.width, height: c.height, format: c.format ?? '', bytes: c.bytes ?? 0 };
};

export async function createPhoto(input: PhotoCreateMeta, images: PhotoAsset[]): Promise<PhotoDoc> {
  const _id = new ObjectId();
  const now = new Date();
  const doc: PhotoDoc = {
    _id,
    title: input.title,
    slug: buildSlug(input.title, _id),
    description: input.description,
    tags: input.tags,
    hashtags: input.hashtags,
    location: input.location,
    device: input.device,
    categories: input.categories,
    images,
    ...coverFields(images),
    likesCount: 0,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  await photosCol().insertOne(doc);
  return doc;
}

export async function updatePhoto(id: ObjectId, input: PhotoUpdateMeta, images?: PhotoAsset[]) {
  const $set: Partial<PhotoDoc> = { ...input, updatedAt: new Date() };
  if (images) Object.assign($set, { images, ...coverFields(images) });
  if (input.title) $set.slug = buildSlug(input.title, id);
  // Al guardar el array nuevo se retira el campo antiguo de una sola categoría.
  const update = input.categories ? { $set, $unset: { category: '' as const } } : { $set };
  return photosCol().findOneAndUpdate({ _id: id }, update, { returnDocument: 'after' });
}

export async function deletePhotoDoc(id: ObjectId) {
  await photosCol().deleteOne({ _id: id });
  await db.collection('likes').deleteMany({ photoId: id });
}
