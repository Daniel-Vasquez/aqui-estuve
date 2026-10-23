/** "Atardecer en Cusco ☀️" → "atardecer-en-cusco" */
export function slugify(input: string, maxLength = 60): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Nombre seguro para fl_attachment (sin puntos, comas ni barras). */
export function toFileSlug(title: string): string {
  return slugify(title, 80) || 'aqui-estuve-foto';
}
