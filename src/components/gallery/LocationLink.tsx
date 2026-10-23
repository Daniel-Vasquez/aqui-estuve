import { mapsHref, type PhotoLocation } from '@/lib/photos/types';

export default function LocationLink({ location }: { location: PhotoLocation }) {
  return (
    <a href={mapsHref(location)} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-stone-600 underline-offset-4 hover:underline dark:text-stone-300">
      <span aria-hidden>📍</span>{location.name}
    </a>
  );
}
