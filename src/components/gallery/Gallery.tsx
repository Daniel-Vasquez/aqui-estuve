import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { ALL_CATEGORIES_LABEL } from '@/lib/photos/categories';
import { fetchPhotos } from '@/lib/api-client';
import { useLikedPhotos } from '@/hooks/useLikedPhotos';
import { isDesktop } from '@/lib/media';
import PhotoCard from './PhotoCard';
import PhotoSkeleton from './PhotoSkeleton';
import CategoryFilter from './CategoryFilter';
import Lightbox from './Lightbox';

const PAGE_SIZE = 30;
const SKELETONS = 6;

interface Props {
  initialPhotos: PhotoDTO[];
  initialCursor: string | null;
  initialOpenId?: string | null;
  categories: string[];
  initialCategory?: string | null;   // null = Todas
}

export default function Gallery({ initialPhotos, initialCursor, initialOpenId = null, categories, initialCategory = null }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);           // "Cargar más"
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [filtering, setFiltering] = useState(false);       // cambio de categoría en curso
  const [filterError, setFilterError] = useState(false);
  const [generation, setGeneration] = useState(0);         // >0 ⇒ las fotos vienen de un filtro → animar entrada
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const { liked, setLike } = useLikedPhotos();
  const filterRequest = useRef<AbortController | null>(null);

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

  // URL compartible: /?foto=<id>&categoria=<nombre> (sin recargar)
  useEffect(() => {
    const url = new URL(window.location.href);
    openId ? url.searchParams.set('foto', openId) : url.searchParams.delete('foto');
    category ? url.searchParams.set('categoria', category) : url.searchParams.delete('categoria');
    window.history.replaceState(null, '', url);
  }, [openId, category]);

  const index = photos.findIndex((p) => p.id === openId);
  const current = index >= 0 ? photos[index] : null;

  async function changeCategory(next: string | null) {
    if (next === category && !filterError) return;
    setCategory(next);
    setOpenId(null);
    setFilterError(false);
    setFiltering(true);

    // Solo cuenta la última selección: las respuestas anteriores se cancelan.
    filterRequest.current?.abort();
    const controller = new AbortController();
    filterRequest.current = controller;
    try {
      const { photos: list, nextCursor } = await fetchPhotos(null, PAGE_SIZE, next, controller.signal);
      setPhotos(list);
      setCursor(nextCursor);
      syncFromServer(list);
      setGeneration((g) => g + 1);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setFilterError(true);
    } finally {
      if (filterRequest.current === controller) setFiltering(false);
    }
  }

  async function loadMore() {
    if (!cursor || loading || filtering) return;
    setLoading(true);
    try {
      const { photos: more, nextCursor } = await fetchPhotos(cursor, PAGE_SIZE, category);
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

  const empty = !filtering && !filterError && photos.length === 0;

  return (
    <>
      {/* Debajo de la barra superior (título + tema), alineado a la derecha */}
      <div className="mb-6 flex justify-end">
        <CategoryFilter categories={categories} value={category} onChange={changeCategory} />
      </div>

      {filtering ? (
        <div aria-busy="true" className="columns-1 gap-4 md:columns-2 lg:columns-3">
          <span className="sr-only" role="status">Cargando fotos…</span>
          {Array.from({ length: SKELETONS }, (_, i) => <PhotoSkeleton key={i} index={i} />)}
        </div>
      ) : filterError ? (
        <div className="py-24 text-center text-sm text-stone-500">
          <p>No se pudieron cargar las fotos.</p>
          <button type="button" onClick={() => changeCategory(category)} className="mt-3 underline underline-offset-4">
            Reintentar
          </button>
        </div>
      ) : empty ? (
        category ? (
          <div className="py-24 text-center text-sm text-stone-500">
            <p>Aún no hay fotos en «{category}».</p>
            <button type="button" onClick={() => changeCategory(null)}
              className="mt-3 text-stone-900 underline underline-offset-4 dark:text-stone-100">
              Ver {ALL_CATEGORIES_LABEL.toLowerCase()}
            </button>
          </div>
        ) : (
          <p className="py-32 text-center text-stone-500">Todavía no hay fotografías publicadas.</p>
        )
      ) : (
        // key = generation: al filtrar se remonta el grid y cada tarjeta entra con su animación.
        <div key={generation} className="columns-1 gap-4 md:columns-2 lg:columns-3">
          {photos.map((p, i) => (
            <PhotoCard key={p.id} photo={p} eager={i < 6} liked={liked.has(p.id)}
              animate={generation > 0} animationDelay={Math.min(i, 8) * 40}
              onOpen={() => setOpenId(p.id)} onLikeChange={onLikeChange} />
          ))}
        </div>
      )}

      {cursor && !filtering && !filterError && (
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
