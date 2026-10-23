/** Breakpoint `md` de Tailwind: desde aquí la galería abre el lightbox; por debajo es un feed. */
export const DESKTOP_QUERY = '(min-width: 768px)';

export const isDesktop = () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;
