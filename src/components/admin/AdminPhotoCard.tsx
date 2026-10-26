import { DEVICE_A11Y, DEVICE_LABEL, type PhotoDTO } from '@/lib/photos/types';
import { thumbUrl } from '@/lib/cloudinary-url';
import DeviceIcon from '@/components/icons/DeviceIcon';
import MultiImageIcon from '@/components/icons/MultiImageIcon';

export default function AdminPhotoCard({ photo, onEdit, onDelete }: {
  photo: PhotoDTO; onEdit: () => void; onDelete: () => void;
}) {
  const cover = photo.images[0];
  return (
    <article className="group overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
      <div className="relative">
        <img src={thumbUrl(cover.imageUrl, 500)} alt={photo.title} width={cover.width} height={cover.height}
          loading="lazy" className="aspect-[4/3] w-full object-cover" />
        {/* Siempre visible (sin hover). Sin pointer-events-none para que el title muestre su tooltip;
            no tapa controles: Editar/Eliminar están debajo de la imagen. */}
        {photo.device && (
          <span role="img" aria-label={DEVICE_A11Y[photo.device]} title={DEVICE_LABEL[photo.device]}
            className="absolute top-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm">
            <DeviceIcon device={photo.device} decorative className="size-4" />
          </span>
        )}
        {photo.images.length > 1 && (
          <span title={`${photo.images.length} fotos`} aria-label={`${photo.images.length} fotos`} role="img"
            className="absolute top-2.5 right-2.5 z-10 flex h-7 items-center gap-1 rounded-full bg-black/65 px-2 text-xs text-white shadow-sm backdrop-blur-sm tabular-nums">
            <MultiImageIcon className="size-3.5" />{photo.images.length}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{photo.title}</h3>
          <p className="text-xs text-stone-500">
            {new Date(photo.createdAt).toLocaleDateString('es')} · ♥ {photo.likesCount}
            {photo.categories.length > 0 && <> · {photo.categories.join(', ')}</>}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-sm">
          <button type="button" onClick={onEdit} className="hover:underline">Editar</button>
          <button type="button" onClick={onDelete} className="text-red-600 hover:underline">Eliminar</button>
        </div>
      </div>
    </article>
  );
}
