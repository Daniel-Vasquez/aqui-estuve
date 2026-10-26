import { useState, type DragEvent } from 'react';
import { MAX_IMAGES_PER_POST, type PhotoAsset } from '@/lib/photos/types';
import { thumbUrl } from '@/lib/cloudinary-url';

/** Imagen ya publicada o archivo local pendiente de subir. El orden define la portada (la primera). */
export type ImageItem =
  | { key: string; kind: 'existing'; asset: PhotoAsset }
  | { key: string; kind: 'new'; file: File; preview: string };

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']);
// Algunos navegadores no informan el tipo de HEIC: se acepta por extensión.
const isAllowed = (f: File) => ALLOWED.has(f.type) || (!f.type && /\.(heic|heif)$/i.test(f.name));

let seq = 0;
export const newItem = (file: File): ImageItem =>
  ({ key: `new-${++seq}`, kind: 'new', file, preview: URL.createObjectURL(file) });

interface Props {
  items: ImageItem[];
  onChange: (items: ImageItem[]) => void;
  maxBytes: number;
}

const TILE_BTN = 'rounded-full bg-black/65 text-white backdrop-blur-sm transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white';

/** Cuadrícula de fotos de la publicación: añadir (hasta 5), quitar y elegir portada. */
export default function ImagesField({ items, onChange, maxBytes }: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const free = MAX_IMAGES_PER_POST - items.length;

  function add(list: FileList | File[]) {
    const files = [...list];
    const invalid = files.filter((f) => !isAllowed(f));
    const tooBig = files.filter((f) => isAllowed(f) && f.size > maxBytes);
    const valid = files.filter((f) => isAllowed(f) && f.size <= maxBytes);
    const accepted = valid.slice(0, Math.max(free, 0));

    const msgs: string[] = [];
    if (valid.length > accepted.length) {
      msgs.push(`Máximo ${MAX_IMAGES_PER_POST} fotos por publicación: se añadieron ${accepted.length === 0 ? 'ninguna' : `las primeras ${accepted.length}`}.`);
    }
    if (invalid.length) msgs.push(`Formato no admitido: ${invalid.map((f) => f.name).join(', ')} (usa JPG, PNG, WebP, AVIF o HEIC).`);
    if (tooBig.length) msgs.push(`Superan ${Math.round(maxBytes / 1024 / 1024)} MB: ${tooBig.map((f) => f.name).join(', ')}.`);
    setNotice(msgs.length ? msgs.join(' ') : null);

    if (accepted.length) onChange([...items, ...accepted.map(newItem)]);
  }

  function remove(key: string) {
    const item = items.find((i) => i.key === key);
    if (item?.kind === 'new') URL.revokeObjectURL(item.preview);
    onChange(items.filter((i) => i.key !== key));
    setNotice(null);
  }

  function makeCover(key: string) {
    const item = items.find((i) => i.key === key);
    if (item) onChange([item, ...items.filter((i) => i.key !== key)]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length) add(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Fotos</span>
        <span className="text-xs text-stone-500 tabular-nums" aria-live="polite">Fotos: {items.length} / {MAX_IMAGES_PER_POST}</span>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item, i) => {
          const src = item.kind === 'new' ? item.preview : thumbUrl(item.asset.imageUrl, 400);
          return (
            <li key={item.key} className="relative aspect-square overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800">
              <img src={src} alt={`Foto ${i + 1}${i === 0 ? ' (portada)' : ''}`} className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                  Portada
                </span>
              ) : (
                <button type="button" onClick={() => makeCover(item.key)} className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 text-[11px] ${TILE_BTN}`}>
                  Usar como portada
                </button>
              )}
              <button type="button" onClick={() => remove(item.key)} aria-label={`Quitar foto ${i + 1}`}
                className={`absolute top-1.5 right-1.5 flex size-6 items-center justify-center text-sm leading-none ${TILE_BTN}`}>
                ×
              </button>
            </li>
          );
        })}

        {free > 0 && (
          <li>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-300 p-2 text-center text-xs text-stone-500 transition hover:border-stone-500 dark:border-stone-700">
              <span className="text-2xl leading-none" aria-hidden>+</span>
              {items.length === 0 ? 'Arrastra o elige fotos' : 'Añadir fotos'}
              <input type="file" multiple accept="image/*" className="sr-only"
                onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ''; }} />
            </label>
          </li>
        )}
      </ul>

      {notice && <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">{notice}</p>}
    </div>
  );
}
