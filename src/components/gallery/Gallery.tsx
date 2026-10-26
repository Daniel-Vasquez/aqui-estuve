import { useCallback, useEffect, useRef, useState } from 'react';
import { DEVICE_LABEL, type PhotoDevice, type PhotoDTO } from '@/lib/photos/types';
import { fetchPhotos } from '@/lib/api-client';
import { useLikedPhotos } from '@/hooks/useLikedPhotos';
import { useGridColumns } from '@/hooks/useGridColumns';
import { isDesktop } from '@/lib/media';
import PhotoCard from './PhotoCard';
import PhotoSkeleton from './PhotoSkeleton';
import MasonryGrid from './MasonryGrid';
import FilterSelect from './FilterSelect';
import Lightbox from './Lightbox';

const PAGE_SIZE = 30;
const SKELETONS = 6;

interface Filters {
  category: string | null;      // null = todas
  device: PhotoDevice | null;   // null = todos
}
const NO_FILTERS: Filters = { category: null, device: null };

interface Props {
  initialPhotos: PhotoDTO[];
  initialCursor: string | null;
  initialOpenId?: string | null;
  categories: string[];
  devices: PhotoDevice[];            // dispositivos con al menos una foto
  initialFilters?: Filters;
}

export default function Gallery({ initialPhotos, initialCursor, initialOpenId = null, categories, devices, initialFilters = NO_FILTERS }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);           // "Cargar más"
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [filtering, setFiltering] = useState(false);       // cambio de filtros en curso
  const [filterError, setFilterError] = useState(false);
  const [generation, setGeneration] = useState(0);         // >0 ⇒ las fotos vienen de un filtro → animar entrada
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const { liked, setLike } = useLikedPhotos();
  const columns = useGridColumns();
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

  // URL compartible: /?foto=<id>&categoria=<nombre>&dispositivo=<iphone|camera> (sin recargar)
  useEffect(() => {
    const url = new URL(window.location.href);
    const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set('foto', openId);
    set('categoria', filters.category);
    set('dispositivo', filters.device);
    window.history.replaceState(null, '', url);
  }, [openId, filters]);

  const hasFilters = filters.category !== null || filters.device !== null;

  const index = photos.findIndex((p) => p.id === openId);
  const current = index >= 0 ? photos[index] : null;

  /** Aplica filtros (uno, ambos o ninguno) con una sola petición. */
  async function applyFilters(next: Filters) {
    if (next.category === filters.category && next.device === filters.device && !filterError) return;
    setFilters(next);
    setOpenId(null);
    setFilterError(false);
    setFiltering(true);

    // Solo cuenta la última selección: las respuestas anteriores se cancelan.
    filterRequest.current?.abort();
    const controller = new AbortController();
    filterRequest.current = controller;
    try {
      const { photos: list, nextCursor } = await fetchPhotos({ limit: PAGE_SIZE, ...next, signal: controller.signal });
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
      const { photos: more, nextCursor } = await fetchPhotos({ cursor, limit: PAGE_SIZE, ...filters });
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
      {/* Debajo de la barra superior (título + tema), a la derecha. Orden: Limpiar → Categoría → Dispositivo.
          flex-wrap: en móvil estrecho pasa a dos líneas sin alterar el orden. */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <button type="button" disabled={!hasFilters} onClick={() => applyFilters(NO_FILTERS)}
          className="cursor-pointer text-sm text-stone-700 transition-opacity hover:opacity-75 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-35 dark:text-stone-300">
          Limpiar filtros
        </button>
        <FilterSelect label="Filtrar por categoría" allLabel="Categoría"
          options={categories.map((c) => ({ value: c, label: c }))}
          value={filters.category} onChange={(category) => applyFilters({ ...filters, category })} />
        <FilterSelect label="Filtrar por dispositivo" allLabel="Dispositivo"
          options={devices.map((d) => ({ value: d, label: DEVICE_LABEL[d] }))}
          value={filters.device} onChange={(device) => applyFilters({ ...filters, device })} />
      </div>

      {filtering ? (
        <div aria-busy="true">
          <span className="sr-only" role="status">Cargando fotos…</span>
          {/* Misma estructura de columnas que el grid real */}
          <MasonryGrid items={Array.from({ length: SKELETONS }, (_, i) => i)} columns={columns}
            getKey={(i) => i} render={(i) => <PhotoSkeleton index={i} />} />
        </div>
      ) : filterError ? (
        <div className="py-24 text-center text-sm text-stone-500">
          <p>No se pudieron cargar las fotos.</p>
          <button type="button" onClick={() => applyFilters(filters)} className="mt-3 underline underline-offset-4">
            Reintentar
          </button>
        </div>
      ) : empty ? (
        hasFilters ? (
          <div className="py-24 text-center text-sm text-stone-500">
            <p>No hay fotos con {filters.category && filters.device ? 'esa combinación' : 'ese filtro'}:{' '}
              {[filters.category && `«${filters.category}»`, filters.device && DEVICE_LABEL[filters.device]].filter(Boolean).join(' · ')}.
            </p>
            <button type="button" onClick={() => applyFilters(NO_FILTERS)}
              className="mt-3 text-stone-900 underline underline-offset-4 dark:text-stone-100">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <p className="py-32 text-center text-stone-500">Todavía no hay fotografías publicadas.</p>
        )
      ) : (
        // key = generation: al filtrar se remonta el grid y cada tarjeta entra con su animación.
        <MasonryGrid key={generation} items={photos} columns={columns} getKey={(p) => p.id}
          render={(p, i) => (
            <PhotoCard photo={p} eager={i < 6} liked={liked.has(p.id)}
              animate={generation > 0} animationDelay={Math.min(i, 8) * 40}
              onOpen={() => setOpenId(p.id)} onLikeChange={onLikeChange} />
          )} />
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
        onLikeChange={onLikeChange}
      />
    </>
  );
}
