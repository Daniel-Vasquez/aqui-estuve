/** Dos fotos apiladas: la publicación tiene varias imágenes. Decorativo (el texto accesible va en el contenedor). */
export default function MultiImageIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="8" y="8" width="12.5" height="12.5" rx="2" />
      <path d="M16 4.5H6A2.5 2.5 0 0 0 3.5 7v10" />
    </svg>
  );
}
