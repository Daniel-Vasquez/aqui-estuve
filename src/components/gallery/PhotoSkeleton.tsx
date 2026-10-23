// Proporciones variadas para imitar el masonry y no dar saltos al llegar las fotos reales.
const RATIOS = ['aspect-[4/5]', 'aspect-[3/2]', 'aspect-[3/4]', 'aspect-square', 'aspect-[2/3]', 'aspect-[4/3]'];
const BLOCK = 'animate-pulse bg-stone-200 dark:bg-stone-800';

/** Tarjeta de carga: en mobile imita el feed (cabecera, imagen, acciones); en desktop solo la imagen. */
export default function PhotoSkeleton({ index }: { index: number }) {
  return (
    <div aria-hidden className="mb-12 break-inside-avoid md:mb-4">
      <div className={`mb-3 h-5 w-2/3 rounded md:hidden ${BLOCK}`} />
      <div className={`w-full rounded-lg ${RATIOS[index % RATIOS.length]} ${BLOCK}`} />
      <div className="mt-3 flex gap-3 md:hidden">
        <div className={`h-10 w-20 rounded-full ${BLOCK}`} />
        <div className={`h-10 w-14 rounded-full ${BLOCK}`} />
      </div>
    </div>
  );
}
