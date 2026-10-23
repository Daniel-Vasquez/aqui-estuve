import { useEffect, useState, type SubmitEvent } from 'react';
import { DEVICE_LABEL, PHOTO_DEVICES, type PhotoDevice, type PhotoDTO } from '@/lib/photos/types';
import { ApiError, createPhoto, updatePhoto, type PhotoMetadata } from '@/lib/api-client';
import { thumbUrl } from '@/lib/cloudinary-url';
import DeviceIcon from '@/components/icons/DeviceIcon';
import TagInput from './TagInput';
import CategoryPicker from './CategoryPicker';

const DEVICE_OPTIONS: { value: PhotoDevice | null; label: string }[] = [
  { value: null, label: 'Sin indicar' },
  ...PHOTO_DEVICES.map((d) => ({ value: d, label: DEVICE_LABEL[d] })),
];

interface Props {
  photo?: PhotoDTO;                 // presente = modo edición
  categories: string[];
  maxBytes: number;                 // UPLOAD_MAX_MB en bytes (lo pasa la página)
  onSaved: (p: PhotoDTO) => void;
  onCancel: () => void;
}

/** ISO → valor para <input type="datetime-local"> en hora local. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function PhotoForm({ photo, categories, maxBytes, onSaved, onCancel }: Props) {
  const editing = Boolean(photo);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photo ? thumbUrl(photo.imageUrl, 800) : null);
  const [title, setTitle] = useState(photo?.title ?? '');
  const [description, setDescription] = useState(photo?.description ?? '');
  const [tags, setTags] = useState<string[]>(photo?.tags ?? []);
  const [hashtags, setHashtags] = useState<string[]>(photo?.hashtags ?? []);
  const [locName, setLocName] = useState(photo?.location?.name ?? '');
  const [mapsUrl, setMapsUrl] = useState(photo?.location?.mapsUrl ?? '');
  const [device, setDevice] = useState<PhotoDevice | null>(photo?.device ?? null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(photo?.categories ?? []);
  const [date, setDate] = useState(toLocalInput(photo?.createdAt ?? new Date().toISOString()));
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Libera la URL de objeto de la vista previa local.
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  function pickFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!editing && !file) return setError('Selecciona una imagen');
    if (selectedCategories.length === 0) return setError('Elige al menos una categoría');

    const metadata: PhotoMetadata = {
      title,
      description,
      tags,
      hashtags,
      location: locName.trim() ? { name: locName.trim(), ...(mapsUrl.trim() ? { mapsUrl: mapsUrl.trim() } : {}) } : null,
      device,
      categories: selectedCategories,
      createdAt: new Date(date).toISOString(),
    };

    setSaving(true);
    try {
      const saved = editing
        ? await updatePhoto(photo!.id, metadata)
        : await createPhoto(file!, metadata, { maxBytes, onProgress: setProgress });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const input = 'rounded-lg border border-stone-300 bg-transparent px-3 py-2 dark:border-stone-700';

  return (
    <form onSubmit={onSubmit}
      className="grid w-[min(960px,95vw)] gap-6 rounded-2xl bg-white p-6 text-stone-900 md:grid-cols-2 dark:bg-stone-900 dark:text-stone-100">
      {/* Columna imagen */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!editing) pickFile(e.dataTransfer.files[0]); }}
        className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700"
      >
        {preview ? (
          <img src={preview} alt="Vista previa" className="max-h-[60vh] w-full object-contain" />
        ) : (
          <label className="cursor-pointer p-8 text-center text-sm text-stone-500">
            Arrastra una foto o <span className="underline">elige un archivo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
              className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
        )}
      </div>

      {/* Columna metadatos */}
      <div className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl">{editing ? 'Editar publicación' : 'Nueva publicación'}</h2>
        <input required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className={input} />
        <textarea rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="La historia detrás de la foto…" className={input} />
        <CategoryPicker categories={categories} value={selectedCategories} onChange={setSelectedCategories} />
        <TagInput label="Etiquetas" value={tags} onChange={setTags} placeholder="viajes, montaña…" />
        <TagInput label="Hashtags" prefix="#" value={hashtags} onChange={setHashtags} placeholder="#atardecer" />
        <input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Lugar (p. ej. Plaza de Armas, Cusco)" className={input} />
        <input type="url" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Enlace de Google Maps (opcional)" className={input} />
        {/* Selector segmentado: radios nativos (teclado y lectores de pantalla) con estilo de botones */}
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-medium">Dispositivo</legend>
          <div className="flex rounded-lg border border-stone-300 p-1 dark:border-stone-700">
            {DEVICE_OPTIONS.map((opt) => (
              <label key={opt.label}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-stone-600 transition has-checked:bg-stone-900 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 dark:text-stone-300 dark:has-checked:bg-stone-100 dark:has-checked:text-stone-900">
                <input type="radio" name="device" className="sr-only"
                  checked={device === opt.value} onChange={() => setDevice(opt.value)} />
                {opt.value && <DeviceIcon device={opt.value} decorative className="size-4" />}
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Fecha</span>
          <input type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </label>

        {progress !== null && (
          <div className="h-2 overflow-hidden rounded bg-stone-200 dark:bg-stone-800">
            <div className="h-full bg-stone-900 transition-all dark:bg-stone-100" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-auto flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2">Cancelar</button>
          <button disabled={saving} className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
            {saving ? (progress !== null && progress < 100 ? `Subiendo ${progress}%` : 'Guardando…') : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  );
}
