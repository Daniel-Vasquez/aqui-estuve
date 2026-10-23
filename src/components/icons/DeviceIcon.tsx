import { DEVICE_A11Y, type PhotoDevice } from '@/lib/photos/types';

interface Props {
  device: PhotoDevice | null | undefined;
  className?: string;
  /** true cuando ya hay texto visible al lado (p. ej. en el selector): se oculta a lectores de pantalla */
  decorative?: boolean;
}

/** Icono de trazo fino del dispositivo de captura. Sin valor → no renderiza nada. */
export default function DeviceIcon({ device, className = 'size-4', decorative = false }: Props) {
  if (!device) return null;
  const label = DEVICE_A11Y[device];

  return (
    <svg
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {!decorative && <title>{label}</title>}
      {device === 'iphone' ? (
        <>
          <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
          <path d="M10.5 18.5h3" />
        </>
      ) : (
        <>
          <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5l1.5-2h6l1.5 2H19a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18Z" />
          <circle cx="12" cy="13" r="3.5" />
        </>
      )}
    </svg>
  );
}
