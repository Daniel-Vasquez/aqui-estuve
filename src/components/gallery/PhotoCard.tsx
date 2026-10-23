import type { PhotoDTO } from '@/lib/photos/types';
import { downloadUrl, thumbSrcSet, thumbUrl } from '@/lib/cloudinary-url';
import { formatDimensions, formatPhotoDate } from '@/lib/format';
import { isDesktop } from '@/lib/media';
import DeviceIcon from '@/components/icons/DeviceIcon';
import DownloadIcon from '@/components/icons/DownloadIcon';
import LikeButton from './LikeButton';
import LocationLink from './LocationLink';

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
 * Desktop (md+): solo la imagen; clic → lightbox; nombre + dispositivo en hover.
 * Mobile (< md): tarjeta de feed con toda la información; la imagen no abre el modal.
 */
export default function PhotoCard({ photo, liked, eager, animate, animationDelay = 0, onOpen, onLikeChange }: Props) {
  return (
    <article id={`foto-${photo.id}`}
      style={animate ? { animationDelay: `${animationDelay}ms` } : undefined}
      className={`mb-12 break-inside-avoid scroll-mt-4 md:mb-4 ${animate ? 'animate-fade-up motion-reduce:animate-none' : ''}`}>
      {/* 1. Cabecera (mobile): nombre + icono de dispositivo a su derecha */}
      <header className="mb-3 flex items-center justify-between gap-3 md:hidden">
        <h2 className="min-w-0 font-serif text-lg leading-tight">{photo.title}</h2>
        <DeviceIcon device={photo.device} className="size-4 shrink-0 text-stone-500 dark:text-stone-400" />
      </header>

      {/* 2. Imagen. En mobile no reacciona al toque (pointer-events) y el handler también lo verifica (teclado). */}
      <button
        type="button"
        onClick={() => { if (isDesktop()) onOpen(); }}
        aria-label={`Ver detalle de ${photo.title}`}
        className="group pointer-events-none relative block w-full cursor-default overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 md:pointer-events-auto md:cursor-pointer"
      >
        <img
          src={thumbUrl(photo.imageUrl, 800)}
          srcSet={thumbSrcSet(photo.imageUrl)}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          width={photo.width}
          height={photo.height}            // reserva espacio → sin CLS
          alt={photo.title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="h-auto w-full bg-stone-200 transition duration-500 md:group-hover:scale-[1.02] dark:bg-stone-800"
        />
        {/* Desktop: nombre + icono comparten la capa → misma aparición en hover */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-3 text-left text-sm text-white opacity-0 transition group-hover:opacity-100 md:flex">
          <span className="min-w-0 truncate">{photo.title}</span>
          <DeviceIcon device={photo.device} className="size-4 shrink-0 drop-shadow" />
        </span>
      </button>

      {/* 3–8. Detalle (solo mobile) */}
      <div className="mt-3 flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-3">
          <LikeButton photoId={photo.id} count={photo.likesCount} liked={liked}
            onChange={(s) => onLikeChange(photo.id, s)} />
          {/* fl_attachment ⇒ descarga directa del original */}
          <a href={downloadUrl(photo.imageUrl, photo.title)} rel="noopener"
            aria-label="Descargar original en alta calidad" title="Descargar original en alta calidad"
            className="flex items-center rounded-full border border-stone-300 px-4 py-2 text-stone-600 transition hover:scale-105 dark:border-stone-700 dark:text-stone-300">
            <DownloadIcon className="size-5" />
          </a>
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
          <span className="tabular-nums">{formatDimensions(photo.width, photo.height)}</span>
        </footer>
      </div>
    </article>
  );
}
