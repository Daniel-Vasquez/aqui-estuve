import { useCallback, useEffect, useState } from 'react';

const KEY = 'aqui-estuve:likes';

function read(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}
function write(set: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
}

export function useLikedPhotos() {
  const [liked, setLiked] = useState<Set<string>>(() => new Set());

  useEffect(() => { setLiked(read()); }, []);   // tras hidratar (evita mismatch SSR)

  const setLike = useCallback((id: string, value: boolean) => {
    setLiked((prev) => {
      const next = new Set(prev);
      value ? next.add(id) : next.delete(id);
      write(next);
      return next;
    });
  }, []);

  return { liked, setLike };
}
