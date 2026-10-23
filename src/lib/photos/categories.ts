/** Categorías base (siempre disponibles). Las que cree el admin se suman a estas. */
export const BASE_CATEGORIES = [
  'Edificios',
  'Naturaleza',
  'Paisaje',
  'Paseo en bici',
  'Animales',
  'Deporte',
  'Urbano',
  'Retrato',
  'Nocturna',
  'Cotidiano',
] as const;

/** Valor reservado del filtro público: sin filtro. */
export const ALL_CATEGORIES_LABEL = 'Todas';

export const CATEGORY_MAX_LENGTH = 40;

/** Cada foto: entre 1 y 3 categorías (clasificación curada; para lo demás están tags y hashtags). */
export const MAX_CATEGORIES_PER_PHOTO = 3;

/** "  paseo   en bici " → "paseo en bici" */
export const normalizeCategory = (name: string) => name.trim().replace(/\s+/g, ' ');

/** Clave de comparación: sin tildes ni mayúsculas ("Árboles" ≡ "arboles"). */
export const categoryKey = (name: string) =>
  normalizeCategory(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const sameCategory = (a: string, b: string) => categoryKey(a) === categoryKey(b);

/** Normaliza, quita vacíos y duplicados (sin distinguir mayúsculas/tildes), conservando el primero. */
export function dedupeCategories(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const name = normalizeCategory(raw);
    const key = categoryKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
