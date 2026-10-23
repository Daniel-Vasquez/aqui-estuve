import { downloadUrl } from '@/lib/cloudinary-url';
import DownloadIcon from '@/components/icons/DownloadIcon';
import { ACTION_BASE } from './action-styles';

/** Descarga directa del original (fl_attachment ⇒ Content-Disposition: attachment, funciona cross-origin). */
export default function DownloadButton({ imageUrl, title }: { imageUrl: string; title: string }) {
  return (
    <a href={downloadUrl(imageUrl, title)} rel="noopener"
      aria-label="Descargar original en alta calidad" title="Descargar original en alta calidad"
      className={ACTION_BASE}>
      <DownloadIcon className="size-6 md:size-5" />
      {/* Desktop: icono + texto. Mobile: solo icono. */}
      <span className="hidden text-sm md:inline">Descargar</span>
    </a>
  );
}
