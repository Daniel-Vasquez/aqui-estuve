import { MongoServerError } from 'mongodb';
import { db } from '../db';
import { BASE_CATEGORIES, categoryKey, dedupeCategories, normalizeCategory } from './categories';
import { photosCol } from './repository';

interface CategoryDoc {
  name: string;      // forma visible ("Paseo en bici")
  key: string;       // clave única sin tildes/mayúsculas
  createdAt: Date;
}

const categoriesCol = () => db.collection<CategoryDoc>('categories');

/** Base (en su orden) + personalizadas (alfabético). También recoge categorías ya usadas en fotos. */
export async function listCategories(): Promise<string[]> {
  const [custom, used, usedLegacy] = await Promise.all([
    categoriesCol().find({}, { projection: { name: 1 } }).toArray(),
    photosCol().distinct('categories'),   // array nuevo (distinct aplana los arrays)
    photosCol().distinct('category'),     // campo antiguo
  ]);

  const seen = new Set<string>(BASE_CATEGORIES.map(categoryKey));
  const extra: string[] = [];
  for (const name of [...custom.map((c) => c.name), ...used, ...usedLegacy]) {
    if (typeof name !== 'string' || !name) continue;
    const key = categoryKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    extra.push(name);
  }
  return [...BASE_CATEGORIES, ...extra.sort((a, b) => a.localeCompare(b, 'es'))];
}

/** Resuelve una lista ya validada (1–3): nombres canónicos, registrando los nuevos, sin duplicados. */
export async function resolveCategories(list: string[]): Promise<string[]> {
  const resolved = await Promise.all(list.map((c) => resolveCategory(c)));
  return dedupeCategories(resolved);
}

/**
 * Devuelve el nombre canónico de la categoría y la registra si es nueva.
 * "paisaje" → "Paisaje" (base); "  Mi   viaje " → "Mi viaje" (se crea la primera vez).
 * undefined / null se devuelven tal cual (no tocar / quitar categoría).
 */
export async function resolveCategory<T extends string | null | undefined>(raw: T): Promise<string | Exclude<T, string>> {
  if (typeof raw !== 'string') return raw as Exclude<T, string>;
  const name = normalizeCategory(raw);
  const key = categoryKey(name);

  const base = BASE_CATEGORIES.find((b) => categoryKey(b) === key);
  if (base) return base;

  try {
    const doc = await categoriesCol().findOneAndUpdate(
      { key },
      { $setOnInsert: { name, key, createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    );
    return doc?.name ?? name;
  } catch (err) {
    // Dos altas simultáneas de la misma categoría: la otra ganó el índice único.
    if (err instanceof MongoServerError && err.code === 11000) {
      return (await categoriesCol().findOne({ key }))?.name ?? name;
    }
    throw err;
  }
}
