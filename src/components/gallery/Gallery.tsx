import { useCallback, useEffect, useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { fetchPhotos } from '@/lib/api-client';
import { useLikedPhotos } from '@/hooks/useLikedPhotos';
import { isDesktop } from '@/lib/media';
import PhotoCard from './PhotoCard';
import Lightbox from './Lightbox';

interface Props {
  initialPhotos: PhotoDTO[];
  initialCursor: string | null;
  initialOpenId?: string | null;
}

export default function Gallery({ initialPhotos, initialCursor, initialOpenId = null }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const { liked, setLike } = useLikedPhotos();

  // Reconciliar localStorage con lo que dice el servidor.
  const syncFromServer = useCallback((list: PhotoDTO[]) => {
    list.forEach((p) => p.likedByMe !== undefined && setLike(p.id, p.likedByMe));
  }, [setLike]);
  useEffect(() => { syncFromServer(initialPhotos); }, [initialPhotos, syncFromServer]);

  // Enlace compartido abierto en mobile: no hay lightbox → se desplaza hasta la tarjeta.
  useEffect(() => {
    if (!initialOpenId || isDesktop()) return;
    setOpenId(null);
    document.getElementById(`foto-${initialOpenId}`)?.scrollIntoView({ block: 'start' });
  }, [initialOpenId]);

  // URL compartible: /?foto=<id>
  useEffect(() => {
    const url = new URL(window.location.href);
    openId ? url.searchParams.set('foto', openId) : url.searchParams.delete('foto');
    window.history.replaceState(null, '', url);
  }, [openId]);

  const index = photos.findIndex((p) => p.id === openId);
  const current = index >= 0 ? photos[index] : null;

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const { photos: more, nextCursor } = await fetchPhotos(cursor);
      setPhotos((prev) => [...prev, ...more]);
      setCursor(nextCursor);
      syncFromServer(more);
    } finally {
      setLoading(false);
    }
  }

  function onLikeChange(id: string, s: { liked: boolean; likesCount: number }) {
    setLike(id, s.liked);
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, likesCount: s.likesCount } : p)));
  }

  if (photos.length === 0) {
    return <p className="py-32 text-center text-stone-500">Todavía no hay fotografías publicadas.</p>;
  }

  return (
    <>
      <div className="columns-1 gap-4 md:columns-2 lg:columns-3">
        {photos.map((p, i) => (
          <PhotoCard key={p.id} photo={p} eager={i < 6} liked={liked.has(p.id)}
            onOpen={() => setOpenId(p.id)} onLikeChange={onLikeChange} />
        ))}
      </div>

      {cursor && (
        <div className="mt-10 text-center">
          <button type="button" onClick={loadMore} disabled={loading}
            className="rounded-full border border-stone-300 px-6 py-2 disabled:opacity-50 dark:border-stone-700">
            {loading ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}

      <Lightbox
        photo={current}
        liked={current ? liked.has(current.id) : false}
        onClose={() => setOpenId(null)}
        onPrev={index > 0 ? () => setOpenId(photos[index - 1].id) : undefined}
        onNext={index >= 0 && index < photos.length - 1 ? () => setOpenId(photos[index + 1].id) : undefined}
        onLikeChange={onLikeChange}
      />
    </>
  );
}
