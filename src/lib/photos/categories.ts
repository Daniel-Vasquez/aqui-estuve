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

/** "  paseo   en bici " → "paseo en bici" */
export const normalizeCategory = (name: string) => name.trim().replace(/\s+/g, ' ');

/** Clave de comparación: sin tildes ni mayúsculas ("Árboles" ≡ "arboles"). */
export const categoryKey = (name: string) =>
  normalizeCategory(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const sameCategory = (a: string, b: string) => categoryKey(a) === categoryKey(b);
