import { useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { ApiError, deletePhoto, fetchPhotos } from '@/lib/api-client';
import Modal from '@/components/ui/Modal';
import PhotoForm from './PhotoForm';
import AdminPhotoCard from './AdminPhotoCard';
import ConfirmDialog from './ConfirmDialog';

type Editor = { mode: 'create' } | { mode: 'edit'; photo: PhotoDTO } | null;

export default function AdminDashboard({ initialPhotos, initialCursor, maxBytes }: {
  initialPhotos: PhotoDTO[]; initialCursor: string | null; maxBytes: number;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [editor, setEditor] = useState<Editor>(null);
  const [toDelete, setToDelete] = useState<PhotoDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function onSaved(saved: PhotoDTO) {
    setPhotos((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      const next = exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
    setEditor(null);
    setNotice('Guardado ✔');
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePhoto(toDelete.id);
      setPhotos((prev) => prev.filter((p) => p.id !== toDelete.id));
      setNotice('Publicación eliminada');
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Error eliminando');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  async function loadMore() {
    const { photos: more, nextCursor } = await fetchPhotos(cursor);
    setPhotos((prev) => [...prev, ...more]);
    setCursor(nextCursor);
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Publicaciones <span className="text-stone-400">({photos.length})</span></h1>
        <button type="button" onClick={() => setEditor({ mode: 'create' })}
          className="rounded-lg bg-stone-900 px-4 py-2 text-white dark:bg-stone-100 dark:text-stone-900">
          + Nueva
        </button>
      </div>

      {notice && <p role="status" className="mb-4 text-sm text-stone-600 dark:text-stone-300">{notice}</p>}

      {photos.length === 0 ? (
        <p className="py-24 text-center text-stone-500">Aún no hay fotos. Sube la primera.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((p) => (
            <AdminPhotoCard key={p.id} photo={p}
              onEdit={() => setEditor({ mode: 'edit', photo: p })}
              onDelete={() => setToDelete(p)} />
          ))}
        </div>
      )}

      {cursor && (
        <div className="mt-8 text-center">
          <button type="button" onClick={loadMore} className="underline">Cargar más</button>
        </div>
      )}

      <Modal open={editor !== null} onClose={() => setEditor(null)}>
        {editor && (
          <PhotoForm
            key={editor.mode === 'edit' ? editor.photo.id : 'new'}
            photo={editor.mode === 'edit' ? editor.photo : undefined}
            maxBytes={maxBytes}
            onSaved={onSaved}
            onCancel={() => setEditor(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        busy={deleting}
        title="¿Eliminar publicación?"
        message={`"${toDelete?.title ?? ''}" se borrará de la base de datos y de Cloudinary. No se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
