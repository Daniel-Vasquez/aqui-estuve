// Proporciones variadas para imitar el masonry y no dar saltos al llegar las fotos reales.
const RATIOS = ['aspect-[4/5]', 'aspect-[3/2]', 'aspect-[3/4]', 'aspect-square', 'aspect-[2/3]', 'aspect-[4/3]'];
const BLOCK = 'animate-pulse bg-stone-200 dark:bg-stone-800';

/** Tarjeta de carga: en mobile imita el feed (cabecera, imagen, acciones); en desktop solo la imagen. */
export default function PhotoSkeleton({ index }: { index: number }) {
  return (
    <div aria-hidden className="mb-12 md:mb-4">
      <div className={`mb-3 h-5 w-2/3 rounded md:hidden ${BLOCK}`} />
      <div className={`w-full rounded-lg ${RATIOS[index % RATIOS.length]} ${BLOCK}`} />
      {/* Acciones sin caja: ❤ + contador y el icono de descarga */}
      <div className="mt-3 flex items-center gap-5 md:hidden">
        <div className={`h-6 w-11 rounded ${BLOCK}`} />
        <div className={`size-6 rounded ${BLOCK}`} />
      </div>
    </div>
  );
}
