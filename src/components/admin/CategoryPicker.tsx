import { useEffect, useRef, useState } from 'react';
import {
  ALL_CATEGORIES_LABEL,
  CATEGORY_MAX_LENGTH,
  MAX_CATEGORIES_PER_PHOTO,
  normalizeCategory,
  sameCategory,
} from '@/lib/photos/categories';

interface Props {
  categories: string[];                 // catálogo disponible
  value: string[];                      // seleccionadas (1–3)
  onChange: (v: string[]) => void;
}

const CHIP = 'rounded-full border px-3 py-1 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2';
const OFF = 'border-stone-300 text-stone-600 hover:border-stone-500 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500';
const ON = 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900';
const LOCKED = 'opacity-40 cursor-not-allowed';

/** Chips multi-selección (máx. 3) + "+ Nueva categoría…" inline, que se añade ya marcada. */
export default function CategoryPicker({ categories, value, onChange }: Props) {
  // Las nuevas aún no guardadas (y cualquier seleccionada fuera del catálogo) se muestran igualmente.
  const [pending, setPending] = useState<string[]>([]);
  const options = [...categories, ...[...pending, ...value].filter((v, i, all) =>
    !categories.some((c) => sameCategory(c, v)) && all.findIndex((x) => sameCategory(x, v)) === i)];

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);

  const full = value.length >= MAX_CATEGORIES_PER_PHOTO;
  const isOn = (c: string) => value.some((v) => sameCategory(v, c));

  function toggle(c: string) {
    if (isOn(c)) onChange(value.filter((v) => !sameCategory(v, c)));
    else if (!full) onChange([...value, c]);
  }

  function addNew() {
    const name = normalizeCategory(draft);
    if (!name) return;
    if (sameCategory(name, ALL_CATEGORIES_LABEL)) return setError(`"${ALL_CATEGORIES_LABEL}" es un nombre reservado`);
    // Si ya existe (sin distinguir mayúsculas/tildes) se reutiliza la existente.
    const existing = options.find((c) => sameCategory(c, name));
    if (!existing) setPending((p) => [...p, name]);
    const chosen = existing ?? name;
    if (!isOn(chosen) && !full) onChange([...value, chosen]);
    setDraft('');
    setError(null);
    setCreating(false);
  }

  function cancel() {
    setDraft('');
    setError(null);
    setCreating(false);
  }

  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between">
        <legend className="font-medium">Categorías</legend>
        <span className="text-xs text-stone-500 tabular-nums" aria-live="polite">
          Seleccionadas: {value.length} / {MAX_CATEGORIES_PER_PHOTO}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const on = isOn(c);
          const locked = full && !on;
          return (
            <button key={c} type="button" aria-pressed={on} aria-disabled={locked || undefined}
              onClick={() => toggle(c)}
              className={`${CHIP} ${on ? ON : OFF} ${locked ? LOCKED : ''}`}>
              {c}
            </button>
          );
        })}

        {!creating && (
          <button type="button" disabled={full} onClick={() => setCreating(true)}
            title={full ? `Máximo ${MAX_CATEGORIES_PER_PHOTO} categorías` : undefined}
            className={`${CHIP} border-dashed ${OFF} ${full ? LOCKED : ''}`}>
            + Nueva categoría…
          </button>
        )}
      </div>

      {creating && (
        <div className="flex gap-2">
          <input ref={inputRef} value={draft} maxLength={CATEGORY_MAX_LENGTH} placeholder="p. ej. Viajes"
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addNew(); }
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
            }}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-transparent px-3 py-1.5 dark:border-stone-700" />
          <button type="button" onClick={addNew} disabled={!draft.trim()}
            className="shrink-0 rounded-lg bg-stone-900 px-3 py-1.5 text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900">
            Añadir
          </button>
          <button type="button" onClick={cancel} className="shrink-0 px-2 text-stone-500 hover:underline">Cancelar</button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {creating && !error && (
        <p className="text-xs text-stone-500">Se guardará al publicar y quedará disponible en todo el sitio.</p>
      )}
    </fieldset>
  );
}
