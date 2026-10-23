import { useEffect, useRef, useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { downloadUrl, lightboxUrl, thumbUrl } from '@/lib/cloudinary-url';
import Modal from '@/components/ui/Modal';
import DeviceIcon from '@/components/icons/DeviceIcon';
import LikeButton from './LikeButton';
import LocationLink from './LocationLink';

interface Props {
  photo: PhotoDTO | null;
  liked: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onLikeChange: (id: string, s: { liked: boolean; likesCount: number }) => void;
}

export default function Lightbox({ photo, liked, onClose, onPrev, onNext, onLikeChange }: Props) {
  // id de la foto cuya imagen grande ya terminó de cargar (se reinicia sola al cambiar de foto).
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loaded = photo !== null && loadedId === photo.id;

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onPrev, onNext]);

  // Si la imagen ya estaba en caché puede completarse antes de enlazar onLoad.
  useEffect(() => {
    if (photo && imgRef.current?.complete) setLoadedId(photo.id);
  }, [photo]);

  return (
    <Modal open={photo !== null} onClose={onClose} labelledBy="lightbox-title" className="max-h-dvh max-w-[100vw]">
      {photo && (
        // Dimensiones FIJAS desde el primer frame: no dependen de la imagen ni de su carga.
        // Móvil: filas 55dvh (imagen) + resto (info con scroll). Escritorio: columnas 1fr + 380px.
        <div className="grid h-[92dvh] w-[min(1400px,96vw)] grid-rows-[55dvh_minmax(0,1fr)] overflow-hidden rounded-2xl bg-white text-stone-900 lg:h-[90dvh] lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1 dark:bg-stone-900 dark:text-stone-100">
          <div className="relative min-h-0 bg-black">
            {/* Provisional: miniatura (normalmente en caché por la galería) */}
            <img
              key={`thumb-${photo.id}`}
              src={thumbUrl(photo.imageUrl, 800)}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain"
            />
            <img
              key={photo.id}
              ref={imgRef}
              src={lightboxUrl(photo.imageUrl)}
              alt={photo.title}
              width={photo.width}
              height={photo.height}
              onLoad={() => setLoadedId(photo.id)}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Arriba a la izquierda: no choca con las flechas (centro vertical) ni con el cierre (panel) */}
            {photo.device && (
              <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm">
                <DeviceIcon device={photo.device} className="size-4" />
              </span>
            )}
            {onPrev && <button type="button" onClick={onPrev} aria-label="Anterior" className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white">‹</button>}
            {onNext && <button type="button" onClick={onNext} aria-label="Siguiente" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white">›</button>}
          </div>

          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id="lightbox-title" className="font-serif text-2xl leading-tight">{photo.title}</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none">×</button>
            </div>
            <time dateTime={photo.createdAt} className="text-sm text-stone-500">
              {new Date(photo.createdAt).toLocaleDateString('es', { dateStyle: 'long' })}
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
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
              <LikeButton photoId={photo.id} count={photo.likesCount} liked={liked}
                onChange={(s) => onLikeChange(photo.id, s)} />
              {/* fl_attachment ⇒ Cloudinary responde con Content-Disposition: attachment (funciona cross-origin) */}
              <a href={downloadUrl(photo.imageUrl, photo.title)} rel="noopener"
                className="rounded-full bg-stone-900 px-4 py-2 text-white dark:bg-stone-100 dark:text-stone-900">
                ↓ Descargar HD
              </a>
              <span className="text-xs text-stone-500">{photo.width}×{photo.height} · {photo.format.toUpperCase()}</span>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
}
