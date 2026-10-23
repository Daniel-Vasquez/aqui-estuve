import { toFileSlug } from './slug';

const MARKER = '/image/upload/';

/** Inserta una cadena de transformación justo después de /image/upload/. */
export function withTransform(url: string, transformation: string): string {
  const i = url.indexOf(MARKER);
  if (i === -1) return url;
  const at = i + MARKER.length;
  return `${url.slice(0, at)}${transformation}/${url.slice(at)}`;
}

/** Miniatura del grid: optimizada con f_auto,q_auto. */
export const thumbUrl = (url: string, width = 800) =>
  withTransform(url, `c_limit,w_${width},f_auto,q_auto`);

export const thumbSrcSet = (url: string) =>
  [400, 800, 1200, 1600].map((w) => `${thumbUrl(url, w)} ${w}w`).join(', ');

/** Imagen grande del lightbox. */
export const lightboxUrl = (url: string) =>
  withTransform(url, 'c_limit,w_2400,h_2400,f_auto,q_auto:good');

/** Original en máxima calidad + Content-Disposition: attachment; filename=<slug>.<ext> */
export const downloadUrl = (url: string, title: string) =>
  withTransform(url, `fl_attachment:${toFileSlug(title)}`);

/** Imagen para Open Graph / redes. */
export const ogImageUrl = (url: string) =>
  withTransform(url, 'c_fill,g_auto,w_1200,h_630,f_jpg,q_auto');
