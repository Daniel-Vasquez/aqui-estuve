import { useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { thumbSrcSet, thumbUrl } from '@/lib/cloudinary-url';
import { formatDimensions, formatPhotoDate } from '@/lib/format';
import DeviceIcon from '@/components/icons/DeviceIcon';
import MultiImageIcon from '@/components/icons/MultiImageIcon';
import LikeButton from './LikeButton';
import DownloadButton from './DownloadButton';
import LocationLink from './LocationLink';
import ImageCarousel from './ImageCarousel';

interface Props {
  photo: PhotoDTO;
  liked: boolean;
  eager?: boolean;
  animate?: boolean;          // entrada con fade-up (tras filtrar)
  animationDelay?: number;    // ms, escalonado sutil
  onOpen: () => void;
  onLikeChange: (id: string, s: { liked: boolean; likesCount: number }) => void;
}

/**
 * Desktop (md+): solo la portada; clic → lightbox; nombre + dispositivo en hover; icono si hay varias fotos.
 * Mobile (< md): tarjeta de feed con toda la información y carrusel deslizable (sin modal).
 */
export default function PhotoCard({ photo, liked, eager, animate, animationDelay = 0, onOpen, onLikeChange }: Props) {
  const { images } = photo;
  const cover = images[0];
  const multi = images.length > 1;
  // Foto visible en el carrusel móvil: sincroniza descarga y dimensiones.
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];

  return (
    <article id={`foto-${photo.id}`}
      style={animate ? { animationDelay: `${animationDelay}ms` } : undefined}
      className={`mb-12 scroll-mt-4 md:mb-4 ${animate ? 'animate-fade-up motion-reduce:animate-none' : ''}`}>
      {/* 1. Cabecera (mobile): nombre + icono de dispositivo a su derecha */}
      <header className="mb-3 flex items-center justify-between gap-3 md:hidden">
        <h2 className="min-w-0 font-serif text-lg leading-tight">{photo.title}</h2>
        <DeviceIcon device={photo.device} className="size-4 shrink-0 text-stone-500 dark:text-stone-400" />
      </header>

      {/* 2a. Desktop: portada → abre el lightbox */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalle de ${photo.title}${multi ? ` (${images.length} fotos)` : ''}`}
        className="group relative hidden w-full cursor-pointer overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 md:block"
      >
        <img
          src={thumbUrl(cover.imageUrl, 800)}
          srcSet={thumbSrcSet(cover.imageUrl)}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          width={cover.width}
          height={cover.height}            // reserva espacio → sin CLS
          alt={photo.title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="h-auto w-full bg-stone-200 transition duration-500 group-hover:scale-[1.02] dark:bg-stone-800"
        />
        {/* Varias fotos: arriba a la derecha (el dispositivo va abajo a la derecha, en el hover) */}
        {multi && (
          <span className="pointer-events-none absolute top-2.5 right-2.5 flex items-center justify-center rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm">
            <MultiImageIcon className="size-4" />
          </span>
        )}
        {/* Nombre + icono comparten la capa → misma aparición en hover */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-3 text-left text-sm text-white opacity-0 transition group-hover:opacity-100">
          <span className="min-w-0 truncate">{photo.title}</span>
          <DeviceIcon device={photo.device} className="size-4 shrink-0 drop-shadow" />
        </span>
      </button>

      {/* 2b. Mobile: imagen o carrusel deslizable (no abre el modal) */}
      <div className="md:hidden">
        <ImageCarousel images={images} title={photo.title} eager={eager} onIndexChange={setActive} />
      </div>

      {/* 3–8. Detalle (solo mobile) */}
      <div className="mt-3 flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-5">
          <LikeButton photoId={photo.id} count={photo.likesCount} liked={liked}
            onChange={(s) => onLikeChange(photo.id, s)} />
          {/* Descarga la foto que se está viendo en el carrusel */}
          <DownloadButton imageUrl={current.imageUrl} title={multi ? `${photo.title} ${active + 1}` : photo.title} />
        </div>

        {photo.location && <LocationLink location={photo.location} />}

        {photo.description && (
          <p className="whitespace-pre-line leading-relaxed text-stone-700 dark:text-stone-300">{photo.description}</p>
        )}

        {photo.hashtags.length > 0 && (
          <p className="text-sm text-sky-700 dark:text-sky-400">{photo.hashtags.map((h) => `#${h}`).join(' ')}</p>
        )}

        {/* Las etiquetas no se muestran en mobile (solo en el lightbox de desktop). */}

        <footer className="flex items-center justify-between text-xs text-stone-500">
          <time dateTime={photo.createdAt}>{formatPhotoDate(photo.createdAt)}</time>
          <span className="tabular-nums">{formatDimensions(current.width, current.height)}</span>
        </footer>
      </div>
    </article>
  );
}
