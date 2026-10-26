import { useEffect, useRef, useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { lightboxUrl, thumbUrl } from '@/lib/cloudinary-url';
import { formatPhotoDate } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import DeviceIcon from '@/components/icons/DeviceIcon';
import LikeButton from './LikeButton';
import DownloadButton from './DownloadButton';
import LocationLink from './LocationLink';

interface Props {
  photo: PhotoDTO | null;
  liked: boolean;
  onClose: () => void;
  onLikeChange: (id: string, s: { liked: boolean; likesCount: number }) => void;
}

const ARROW = 'absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-white md:flex';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
    </svg>
  );
}

/** Muestra SOLO la publicación seleccionada: las flechas/teclado recorren sus fotos, nunca cambian de publicación. */
export default function Lightbox({ photo, liked, onClose, onLikeChange }: Props) {
  const images = photo?.images ?? [];
  const multi = images.length > 1;
  const [imageIndex, setImageIndex] = useState(0);
  const index = Math.min(imageIndex, Math.max(images.length - 1, 0));
  const current = images[index];

  // Cada publicación abre en su primera foto.
  useEffect(() => { setImageIndex(0); }, [photo?.id]);

  // public_id de la imagen grande ya cargada (para el fundido sobre la miniatura).
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loaded = current !== undefined && loadedKey === current.publicId;

  // Solo con varias fotos; en la primera no hay "anterior" y en la última no hay "siguiente".
  const goPrev = multi && index > 0 ? () => setImageIndex(index - 1) : undefined;
  const goNext = multi && index < images.length - 1 ? () => setImageIndex(index + 1) : undefined;

  // Teclado: sin efecto en publicaciones de 1 foto (no se registra el listener).
  useEffect(() => {
    if (!photo || !multi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev?.();
      if (e.key === 'ArrowRight') goNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, multi, goPrev, goNext]);

  // Si la imagen ya estaba en caché puede completarse antes de enlazar onLoad.
  useEffect(() => {
    if (current && imgRef.current?.complete) setLoadedKey(current.publicId);
  }, [current]);

  return (
    <Modal open={photo !== null} onClose={onClose} labelledBy="lightbox-title" className="max-h-dvh max-w-[100vw]">
      {photo && current && (
        // Dimensiones FIJAS desde el primer frame: no dependen de la imagen ni de su carga.
        // Móvil: filas 55dvh (imagen) + resto (info con scroll). Escritorio: columnas 1fr + 380px.
        <div className="grid h-[92dvh] w-[min(1400px,96vw)] grid-rows-[55dvh_minmax(0,1fr)] overflow-hidden rounded-2xl bg-white text-stone-900 lg:h-[90dvh] lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1 dark:bg-stone-900 dark:text-stone-100">
          <div className="relative min-h-0 bg-black">
            {/* Provisional: miniatura (normalmente en caché por la galería) */}
            <img
              key={`thumb-${current.publicId}`}
              src={thumbUrl(current.imageUrl, 800)}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain"
            />
            <img
              key={current.publicId}
              ref={imgRef}
              src={lightboxUrl(current.imageUrl)}
              alt={multi ? `${photo.title} (${index + 1} de ${images.length})` : photo.title}
              width={current.width}
              height={current.height}
              onLoad={() => setLoadedKey(current.publicId)}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Arriba a la izquierda: no choca con las flechas (centro vertical) ni con el cierre (panel) */}
            {photo.device && (
              <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm">
                <DeviceIcon device={photo.device} className="size-4" />
              </span>
            )}
            {/* Posición dentro de la publicación (solo con varias fotos) */}
            {multi && (
              <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white tabular-nums backdrop-blur-sm"
                aria-live="polite">
                {index + 1} / {images.length}
              </span>
            )}
            {goPrev && (
              <button type="button" onClick={goPrev} className={`${ARROW} left-3`}
                aria-label="Foto anterior">
                <Chevron dir="left" />
              </button>
            )}
            {goNext && (
              <button type="button" onClick={goNext} className={`${ARROW} right-3`}
                aria-label="Foto siguiente">
                <Chevron dir="right" />
              </button>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id="lightbox-title" className="font-serif text-2xl leading-tight">{photo.title}</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none">×</button>
            </div>
            <time dateTime={photo.createdAt} className="text-sm text-stone-500">
              {formatPhotoDate(photo.createdAt)}
            </time>
            {photo.location && <LocationLink location={photo.location} />}
            {photo.description && <p className="whitespace-pre-line leading-relaxed text-stone-700 dark:text-stone-300">{photo.description}</p>}
            {photo.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {photo.tags.map((t) => <li key={t} className="rounded-full bg-stone-200 px-3 py-1 text-xs dark:bg-stone-800">{t}</li>)}
              </ul>
            )}
            {photo.hashtags.length > 0 && (
              <p className="text-sm text-sky-700 dark:text-sky-400">{photo.hashtags.map((h) => `#${h}`).join(' ')}</p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-5 pt-4">
              <LikeButton photoId={photo.id} count={photo.likesCount} liked={liked}
                onChange={(s) => onLikeChange(photo.id, s)} />
              {/* Descarga y dimensiones siguen a la foto que se está viendo */}
              <DownloadButton imageUrl={current.imageUrl} title={multi ? `${photo.title} ${index + 1}` : photo.title} />
              <span className="text-xs text-stone-500 tabular-nums">
                {current.width}×{current.height}{(current.format ?? photo.format) ? ` · ${(current.format ?? photo.format).toUpperCase()}` : ''}
              </span>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
}
