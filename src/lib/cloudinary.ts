import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

const CLOUD_NAME = env('CLOUDINARY_CLOUD_NAME');
const API_KEY = env('CLOUDINARY_API_KEY');
const API_SECRET = env('CLOUDINARY_API_SECRET');

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET, secure: true });

export const FOLDER = env('CLOUDINARY_FOLDER', 'aqui-estuve');
export const MAX_BYTES = Number(env('UPLOAD_MAX_MB', '10')) * 1024 * 1024;
const ALLOWED_FORMATS = 'jpg,png,webp,avif,heic';

/** Datos de la imagen tal como los reporta Cloudinary (fuente de verdad, no el cliente). */
export interface CloudinaryImage {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Firma una subida directa navegador → Cloudinary.
 * El navegador debe enviar EXACTAMENTE estos parámetros (timestamp, folder,
 * allowed_formats) + api_key + signature + file; si cambia cualquiera, Cloudinary rechaza.
 * La firma caduca a la hora (Cloudinary valida el timestamp).
 */
export function signUpload() {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder: FOLDER, allowed_formats: ALLOWED_FORMATS };
  const signature = cloudinary.utils.api_sign_request(params, API_SECRET);
  return {
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    timestamp,
    signature,
    folder: FOLDER,
    allowedFormats: ALLOWED_FORMATS,
  };
}

/** Consulta el recurso en la Admin API. Devuelve null si no existe. */
export async function getImage(publicId: string): Promise<CloudinaryImage | null> {
  try {
    const r = await cloudinary.api.resource(publicId, { resource_type: 'image' });
    return {
      public_id: r.public_id,
      secure_url: r.secure_url,
      width: r.width,
      height: r.height,
      format: r.format,
      bytes: r.bytes,
    };
  } catch (err: unknown) {
    const code = (err as { error?: { http_code?: number } })?.error?.http_code;
    if (code === 404) return null;
    throw err;
  }
}

/** Devuelve true si el recurso quedó eliminado (o ya no existía). */
export async function destroyImage(publicId: string): Promise<boolean> {
  const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  return res.result === 'ok' || res.result === 'not found';
}
