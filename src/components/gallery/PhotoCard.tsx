import type { PhotoDTO } from '@/lib/photos/types';
import { thumbSrcSet, thumbUrl } from '@/lib/cloudinary-url';
import DeviceIcon from '@/components/icons/DeviceIcon';

export default function PhotoCard({ photo, onOpen, eager }: { photo: PhotoDTO; onOpen: () => void; eager?: boolean }) {
  return (
    <button type="button" onClick={onOpen}
      className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2">
      <img
        src={thumbUrl(photo.imageUrl, 800)}
        srcSet={thumbSrcSet(photo.imageUrl)}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        width={photo.width}
        height={photo.height}            // reserva espacio → sin CLS
        alt={photo.title}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-auto w-full bg-stone-200 transition duration-500 group-hover:scale-[1.02] dark:bg-stone-800"
      />
      {/* Nombre + icono comparten la capa: misma aparición en hover (y mismo comportamiento táctil) */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-3 text-left text-sm text-white opacity-0 transition group-hover:opacity-100">
        <span className="min-w-0 truncate">{photo.title}</span>
        <DeviceIcon device={photo.device} className="size-4 shrink-0 drop-shadow" />
      </span>
    </button>
  );
}
