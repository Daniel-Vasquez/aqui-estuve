interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;                 // nombre accesible ("Filtrar por categoría")
  allLabel: string;              // opción sin filtro ("Todas las categorías")
  options: Option<T>[];
  value: T | null;               // null = sin filtro
  onChange: (value: T | null) => void;
}

// Fondo/texto explícitos: el menú desplegable es legible en tema claro y oscuro.
const OPTION = 'bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100';

/** <select> nativo sin caja: solo texto + chevron. Se reconoce como desplegable por la flecha y el hover. */
export default function FilterSelect<T extends string>({ label, allLabel, options, value, onChange }: Props<T>) {
  return (
    <span className="relative inline-flex items-center text-sm text-stone-700 transition-opacity hover:opacity-70 dark:text-stone-300">
      <select
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
        // Sin borde ni padding de caja; pr-4 solo deja sitio al chevron.
        // El foco de teclado se señala con subrayado (no hay anillo).
        className="cursor-pointer appearance-none border-0 border-none bg-transparent p-0 pr-4 focus:ring-0 focus:outline-none focus-visible:underline focus-visible:underline-offset-4"
      >
        <option value="" className={OPTION}>{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value} className={OPTION}>{o.label}</option>)}
      </select>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-0 size-3.5">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}
