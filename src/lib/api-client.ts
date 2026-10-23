import type { PhotoDevice, PhotoDTO } from './photos/types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Error ${res.status}`, data.details);
  return data as T;
}

export interface PhotoMetadata {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  location: { name: string; mapsUrl?: string; lat?: number; lng?: number } | null;
  device: PhotoDevice | null;
  categories: string[];
  createdAt: string; // ISO
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
}

/** Sube el archivo DIRECTO a Cloudinary (XHR para tener progreso). Devuelve el public_id. */
function uploadToCloudinary(file: File, sig: UploadSignature, onProgress?: (pct: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', sig.apiKey);
    fd.append('timestamp', String(sig.timestamp));
    fd.append('signature', sig.signature);
    fd.append('folder', sig.folder);
    fd.append('allowed_formats', sig.allowedFormats);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300 && data.public_id) resolve(data.public_id);
      else reject(new ApiError(xhr.status, data.error?.message ?? 'Cloudinary rechazó la imagen'));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Error de red subiendo a Cloudinary'));
    xhr.send(fd);
  });
}

/** Firma → sube a Cloudinary → registra en /api/photos. */
export async function createPhoto(
  file: File,
  metadata: PhotoMetadata,
  { maxBytes, onProgress }: { maxBytes: number; onProgress?: (pct: number) => void },
) {
  if (file.size > maxBytes) throw new ApiError(413, `La imagen supera ${Math.round(maxBytes / 1024 / 1024)} MB`);
  const sig = await fetch('/api/admin/upload-signature', { method: 'POST' }).then((r) => handle<UploadSignature>(r));
  const publicId = await uploadToCloudinary(file, sig, onProgress);
  const { photo } = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId, ...metadata }),
  }).then((r) => handle<{ photo: PhotoDTO }>(r));
  return photo;
}

export const updatePhoto = (id: string, patch: Partial<PhotoMetadata>) =>
  fetch(`/api/photos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => handle<{ photo: PhotoDTO }>(r)).then((d) => d.photo);

export const deletePhoto = (id: string) =>
  fetch(`/api/photos/${id}`, { method: 'DELETE' }).then((r) => handle<{ ok: true }>(r));

export async function fetchPhotos(cursor?: string | null, limit = 24, category?: string | null, signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (category) params.set('category', category);
  const res = await fetch(`/api/photos?${params}`, { signal });
  return handle<{ photos: PhotoDTO[]; nextCursor: string | null }>(res);
}

export const toggleLike = (id: string) =>
  fetch(`/api/photos/${id}/like`, { method: 'POST' })
    .then((r) => handle<{ liked: boolean; likesCount: number }>(r));
