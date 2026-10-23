import type { PhotoDTO } from '@/lib/photos/types';
import { thumbUrl } from '@/lib/cloudinary-url';

export default function AdminPhotoCard({ photo, onEdit, onDelete }: {
  photo: PhotoDTO; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
      <img src={thumbUrl(photo.imageUrl, 500)} alt={photo.title} width={photo.width} height={photo.height}
        loading="lazy" className="aspect-[4/3] w-full object-cover" />
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
