import { useState } from 'react';
import { toggleLike } from '@/lib/api-client';

interface Props {
  photoId: string;
  count: number;
  liked: boolean;
  onChange: (state: { liked: boolean; likesCount: number }) => void;
}

export default function LikeButton({ photoId, count, liked, onChange }: Props) {
  const [pending, setPending] = useState(false);

  async function click() {
    if (pending) return;
    const prev = { liked, likesCount: count };
    onChange({ liked: !liked, likesCount: Math.max(0, count + (liked ? -1 : 1)) }); // optimista
    setPending(true);
    try {
      onChange(await toggleLike(photoId));                                         // verdad del servidor
    } catch {
      onChange(prev);                                                               // rollback
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={click} aria-pressed={liked}
      aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
      className="flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 transition hover:scale-105 dark:border-stone-700">
      <span aria-hidden className={`text-xl ${liked ? 'text-red-500' : 'text-stone-400'}`}>{liked ? '♥' : '♡'}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
