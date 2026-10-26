import type { ReactNode } from 'react';

interface Props<T> {
  items: T[];
  columns: 2 | 3;
  getKey: (item: T, index: number) => string | number;
  render: (item: T, index: number) => ReactNode;
}

/**
 * Masonry que lee de IZQUIERDA A DERECHA: reparto round-robin (índice % columnas) en columnas
 * independientes; cada columna apila sus tarjetas sin huecos.
 *  - Desktop (md+): grid de N columnas (flex-col cada una).
 *  - Mobile (< md): las columnas son `display: contents` y cada tarjeta lleva `order: índice`,
 *    así el feed vuelve a ser una sola columna en estricto orden cronológico.
 */
export default function MasonryGrid<T>({ items, columns, getKey, render }: Props<T>) {
  const cols: { item: T; index: number }[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, index) => cols[index % columns].push({ item, index }));

  return (
    <div className={`flex flex-col md:grid md:items-start md:gap-4 ${columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
      {cols.map((col, c) => (
        <div key={c} className="contents md:flex md:min-w-0 md:flex-col">
          {col.map(({ item, index }) => (
            <div key={getKey(item, index)} style={{ order: index }}>
              {render(item, index)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
