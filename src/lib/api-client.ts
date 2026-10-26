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

/** Sube un archivo DIRECTO a Cloudinary (XHR para tener progreso). Devuelve el public_id. */
function uploadToCloudinary(file: File, sig: UploadSignature, onBytes?: (loaded: number) => void) {
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
    // e.total incluye la cabecera multipart: se reescala al tamaño del archivo.
    xhr.upload.onprogress = (e) => e.lengthComputable && onBytes?.((e.loaded / e.total) * file.size);
    xhr.onload = () => {
      const data = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300 && data.public_id) resolve(data.public_id);
      else reject(new ApiError(xhr.status, data.error?.message ?? `Cloudinary rechazó «${file.name}»`));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Error de red subiendo a Cloudinary'));
    xhr.send(fd);
  });
}

/**
 * Sube varias fotos EN PARALELO directo a Cloudinary con una sola firma y progreso combinado (0–100).
 * Devuelve los public_id en el mismo orden. Si alguna falla, descarta las que sí subieron.
 */
export async function uploadImages(
  files: File[],
  { maxBytes, onProgress }: { maxBytes: number; onProgress?: (pct: number) => void },
): Promise<string[]> {
  if (!files.length) return [];
  const tooBig = files.find((f) => f.size > maxBytes);
  if (tooBig) throw new ApiError(413, `«${tooBig.name}» supera ${Math.round(maxBytes / 1024 / 1024)} MB`);

  const sig = await fetch('/api/admin/upload-signature', { method: 'POST' }).then((r) => handle<UploadSignature>(r));
  const total = files.reduce((n, f) => n + f.size, 0);
  const loaded = files.map(() => 0);
  const report = () => onProgress?.(Math.round((loaded.reduce((a, b) => a + b, 0) / total) * 100));

  const results = await Promise.allSettled(
    files.map((f, i) => uploadToCloudinary(f, sig, (bytes) => { loaded[i] = bytes; report(); })),
  );
  const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) {
    await discardUploads(ok);
    throw failed.reason;
  }
  return ok;
}

/** Best effort: borra subidas que no llegaron a publicarse (el servidor solo borra huérfanas). */
export async function discardUploads(publicIds: string[]) {
  if (!publicIds.length) return;
  await fetch('/api/admin/discard-uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicIds }),
  }).catch(() => {});
}

/** Registra la publicación con las imágenes ya subidas (la primera es la portada). */
export const createPhoto = (publicIds: string[], metadata: PhotoMetadata) =>
  fetch('/api/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicIds, ...metadata }),
  }).then((r) => handle<{ photo: PhotoDTO }>(r)).then((d) => d.photo);

/** publicIds (opcional) = lista final ordenada: conservadas + nuevas. */
export const updatePhoto = (id: string, patch: Partial<PhotoMetadata> & { publicIds?: string[] }) =>
  fetch(`/api/photos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => handle<{ photo: PhotoDTO }>(r)).then((d) => d.photo);

export const deletePhoto = (id: string) =>
  fetch(`/api/photos/${id}`, { method: 'DELETE' }).then((r) => handle<{ ok: true }>(r));

export interface PhotoQuery {
  cursor?: string | null;
  limit?: number;
  category?: string | null;
  device?: PhotoDevice | null;
  signal?: AbortSignal;
}

export async function fetchPhotos({ cursor, limit = 24, category, device, signal }: PhotoQuery = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (category) params.set('category', category);
  if (device) params.set('device', device);
  const res = await fetch(`/api/photos?${params}`, { signal });
  return handle<{ photos: PhotoDTO[]; nextCursor: string | null }>(res);
}

export const toggleLike = (id: string) =>
  fetch(`/api/photos/${id}/like`, { method: 'POST' })
    .then((r) => handle<{ liked: boolean; likesCount: number }>(r));
