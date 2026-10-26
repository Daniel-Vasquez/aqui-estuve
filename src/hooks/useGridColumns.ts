import { useEffect, useState } from 'react';

// Breakpoints de Tailwind: md = 768px (2 columnas), lg = 1024px (3 columnas).
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023.98px)';

/**
 * Columnas del grid de desktop. El SSR asume 3 (lo habitual); en tablets pasa a 2 al hidratar.
 * En mobile devuelve 3 a propósito: allí las columnas no se ven (display: contents) y así no se
 * remontan las tarjetas al hidratar.
 */
export function useGridColumns(): 2 | 3 {
  const [columns, setColumns] = useState<2 | 3>(3);
  useEffect(() => {
    const mq = window.matchMedia(TABLET_QUERY);
    const update = () => setColumns(mq.matches ? 2 : 3);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return columns;
}
