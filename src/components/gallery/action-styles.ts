/**
 * Estilo compartido de las acciones (❤ y Descargar): sin caja, solo icono (+ texto).
 * - Foco: sin outline con ratón/tacto; anillo solo con teclado (focus-visible).
 * - after:-inset-2 amplía el área táctil sin añadir padding visual.
 */
export const ACTION_BASE =
  'relative inline-flex cursor-pointer items-center gap-1.5 border-0 border-none bg-transparent p-0 shadow-none ' +
  'text-stone-700 transition-all hover:opacity-75 active:scale-95 dark:text-stone-300 ' +
  'focus:outline-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 ' +
  "after:absolute after:-inset-2 after:content-['']";
