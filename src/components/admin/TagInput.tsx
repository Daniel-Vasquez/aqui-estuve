import { useState, type KeyboardEvent } from 'react';

interface Props {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  prefix?: string;       // '#' para hashtags
  placeholder?: string;
}

export default function TagInput({ label, value, onChange, prefix = '', placeholder }: Props) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    // Etiquetas: solo coma (admiten espacios, p. ej. "buenos aires"). Hashtags: coma o espacio.
    const items = raw.split(prefix ? /[,\s]+/ : /,/).map((s) => s.replace(/^#+/, '').trim()).filter(Boolean);
    if (items.length) onChange([...new Set([...value, ...items])]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
    if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex flex-wrap gap-2 rounded-lg border border-stone-300 p-2 dark:border-stone-700">
        {value.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-stone-200 px-2 py-0.5 dark:bg-stone-800">
            {prefix}{t}
            <button type="button" aria-label={`Quitar ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && commit(draft)}
          placeholder={placeholder}
          className="min-w-32 flex-1 bg-transparent outline-none"
        />
      </div>
    </label>
  );
}
