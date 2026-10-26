import { useRef, useState } from 'react';
import type { PhotoAsset } from '@/lib/photos/types';
import { thumbSrcSet, thumbUrl } from '@/lib/cloudinary-url';

interface Props {
  images: PhotoAsset[];
  title: string;
  eager?: boolean;
  onIndexChange?: (index: number) => void;
}

const IMG = 'h-full w-full bg-stone-200 dark:bg-stone-800';

/**
 * Feed móvil. 1 imagen → solo la imagen (sin puntos). Varias → swipe nativo con scroll-snap.
 * La caja mantiene la proporción de la portada: deslizar no cambia la altura (sin saltos);
 * las demás fotos se ajustan dentro (object-contain) sin recortarse.
 */
export default function ImageCarousel({ images, title, eager, onIndexChange }: Props) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const cover = images[0];

  if (images.length === 1) {
    return (
      <img src={thumbUrl(cover.imageUrl, 800)} srcSet={thumbSrcSet(cover.imageUrl)} sizes="100vw"
        width={cover.width} height={cover.height} alt={title}
        loading={eager ? 'eager' : 'lazy'} decoding="async"
        className="h-auto w-full rounded-lg bg-stone-200 dark:bg-stone-800" />
    );
  }

  function onScroll() {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.min(images.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== index) {
      setIndex(i);
      onIndexChange?.(i);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: `${cover.width} / ${cover.height}` }}
      role="region" aria-roledescription="carrusel" aria-label={`${title}: ${images.length} fotos`}>
      <div ref={track} onScroll={onScroll}
        className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
        {images.map((img, i) => (
          <img key={img.publicId} src={thumbUrl(img.imageUrl, 800)} srcSet={thumbSrcSet(img.imageUrl)} sizes="100vw"
            width={img.width} height={img.height} alt={`${title} (${i + 1} de ${images.length})`}
            loading={i === 0 && eager ? 'eager' : 'lazy'} decoding="async"
            className={`shrink-0 snap-center object-contain ${IMG}`} />
        ))}
      </div>

      {/* Puntos: centrados abajo; sombra para verse sobre fotos claras u oscuras */}
      <div aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
        {images.map((img, i) => (
          <span key={img.publicId}
            className={`rounded-full shadow-[0_0_3px_rgba(0,0,0,0.6)] transition-all ${i === index ? 'size-2 bg-white opacity-100' : 'size-1.5 bg-white/50'}`} />
        ))}
      </div>
      <span className="sr-only" aria-live="polite">Foto {index + 1} de {images.length}</span>
    </div>
  );
}
