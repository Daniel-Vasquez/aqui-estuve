import { useState } from 'react';
import { toggleLike } from '@/lib/api-client';
import { ACTION_BASE } from './action-styles';

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
      className={ACTION_BASE}>
      {/* Relleno rojo si ya diste like; solo trazo si no */}
      <svg aria-hidden viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        className={`size-6 transition-colors md:size-5 ${liked ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-current'}`}>
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 8.8 6c1.4 0 2.6.7 3.2 1.8C12.6 6.7 13.8 6 15.2 6a4.3 4.3 0 0 1 4.3 4.3c0 5.6-7.5 10.2-7.5 10.2Z" />
      </svg>
      <span className="text-sm tabular-nums">{count}</span>
    </button>
  );
}
