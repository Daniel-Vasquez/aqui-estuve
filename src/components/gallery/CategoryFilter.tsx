import { ALL_CATEGORIES_LABEL } from '@/lib/photos/categories';

interface Props {
  categories: string[];
  value: string | null;          // null = Todas
  onChange: (category: string | null) => void;
  disabled?: boolean;
}

/** Filtro minimalista: select nativo (accesible y cómodo en móvil) con estilo de píldora. */
export default function CategoryFilter({ categories, value, onChange, disabled }: Props) {
  return (
    <label className="relative inline-flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
      <span>Categoría</span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="cursor-pointer appearance-none rounded-full border border-stone-300 bg-transparent py-1.5 pr-8 pl-3 text-stone-900 transition hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 dark:border-stone-700 dark:text-stone-100 dark:hover:border-stone-500"
      >
        <option value="">{ALL_CATEGORIES_LABEL}</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-2.5 size-4">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
