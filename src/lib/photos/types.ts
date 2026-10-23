import type { ObjectId, WithId } from 'mongodb';

export interface PhotoLocation {
  name: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
}

/** Dispositivo con el que se tomó la foto. */
export const PHOTO_DEVICES = ['iphone', 'camera'] as const;
export type PhotoDevice = (typeof PHOTO_DEVICES)[number];

export const DEVICE_LABEL: Record<PhotoDevice, string> = { iphone: 'iPhone', camera: 'Cámara' };
export const DEVICE_A11Y: Record<PhotoDevice, string> = { iphone: 'Tomada con iPhone', camera: 'Tomada con cámara' };

export interface PhotoDoc {
  _id: ObjectId;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  hashtags: string[];
  location: PhotoLocation | null;
  device?: PhotoDevice | null;   // opcional: las publicaciones anteriores no lo tienen
  categories?: string[];         // 1–3 (las publicaciones anteriores pueden no tenerlo)
  // Formato antiguo (una sola categoría): solo se lee; al guardar se sustituye por `categories`.
  category?: string | null;
  imageUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Forma serializable que viaja al cliente (props de islas y JSON de la API). */
export interface PhotoDTO extends Omit<PhotoDoc, '_id' | 'device' | 'categories' | 'category' | 'createdAt' | 'updatedAt'> {
  id: string;
  device: PhotoDevice | null;
  categories: string[];          // siempre array (normalizado desde cualquier formato)
  createdAt: string;
  updatedAt: string;
  likedByMe?: boolean;
}

export function toDTO(doc: WithId<PhotoDoc> | PhotoDoc, likedByMe?: boolean): PhotoDTO {
  const { _id, createdAt, updatedAt, device, categories, category, ...rest } = doc;
  return {
    ...rest,
    id: _id.toHexString(),
    device: device ?? null,
    categories: photoCategories({ categories, category }),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    ...(likedByMe === undefined ? {} : { likedByMe }),
  };
}

/** Retrocompatibilidad: `categories` (nuevo) › `category` (antiguo, singular) › []. */
export function photoCategories(doc: Pick<PhotoDoc, 'categories' | 'category'>): string[] {
  if (Array.isArray(doc.categories)) return doc.categories;
  return doc.category ? [doc.category] : [];
}

/** Enlace a Google Maps a partir de la ubicación (sin API key). */
export function mapsHref(loc: PhotoLocation): string {
  if (loc.mapsUrl) return loc.mapsUrl;
  const q = loc.lat !== undefined && loc.lng !== undefined ? `${loc.lat},${loc.lng}` : loc.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
