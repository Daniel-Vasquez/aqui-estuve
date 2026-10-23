import type { ObjectId, WithId } from 'mongodb';

export interface PhotoLocation {
  name: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
}

export interface PhotoDoc {
  _id: ObjectId;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  hashtags: string[];
  location: PhotoLocation | null;
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
export interface PhotoDTO extends Omit<PhotoDoc, '_id' | 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt: string;
  updatedAt: string;
  likedByMe?: boolean;
}

export function toDTO(doc: WithId<PhotoDoc> | PhotoDoc, likedByMe?: boolean): PhotoDTO {
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return {
    ...rest,
    id: _id.toHexString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    ...(likedByMe === undefined ? {} : { likedByMe }),
  };
}

/** Enlace a Google Maps a partir de la ubicación (sin API key). */
export function mapsHref(loc: PhotoLocation): string {
  if (loc.mapsUrl) return loc.mapsUrl;
  const q = loc.lat !== undefined && loc.lng !== undefined ? `${loc.lat},${loc.lng}` : loc.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
