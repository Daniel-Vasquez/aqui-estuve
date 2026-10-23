import { useEffect, useRef, useState } from 'react';
import { CATEGORY_MAX_LENGTH } from '@/lib/photos/categories';

const NEW = '__new__';

interface Props {
  categories: string[];
  value: string | null;          // categoría elegida, o texto de la nueva mientras se escribe
  onChange: (v: string | null) => void;
  className: string;             // clases de input del formulario (mismo estilo Light/Dark)
}

/** Select de categorías existentes + "+ Nueva categoría…", que se convierte en un input inline. */
export default function CategoryField({ categories, value, onChange, className }: Props) {
  // Si la foto trae una categoría que no está en la lista (no debería), se muestra igualmente.
  const options = value && !categories.includes(value) ? [...categories, value] : categories;
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);

  if (creating) {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Nueva categoría</span>
        <div className="flex gap-2">
          <input ref={inputRef} value={value ?? ''} maxLength={CATEGORY_MAX_LENGTH}
            onChange={(e) => onChange(e.target.value || null)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCreating(false); onChange(null); } }}
            placeholder="p. ej. Viajes" className={`${className} min-w-0 flex-1`} />
          <button type="button" onClick={() => { setCreating(false); onChange(null); }}
            className="shrink-0 px-2 text-stone-500 hover:underline">Cancelar</button>
        </div>
        <span className="text-xs text-stone-500">Se creará al guardar y quedará disponible en todo el sitio.</span>
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">Categoría</span>
      <select value={value ?? ''} className={className}
        onChange={(e) => {
          if (e.target.value === NEW) { onChange(null); setCreating(true); }
          else onChange(e.target.value || null);
        }}>
        <option value="">Sin categoría</option>
        {options.map((c) => <option key={c} value={c}>{c}</option>)}
        <option value={NEW}>+ Nueva categoría…</option>
      </select>
    </label>
  );
}
