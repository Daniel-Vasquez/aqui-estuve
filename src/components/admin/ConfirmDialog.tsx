import Modal from '@/components/ui/Modal';

interface Props {
  open: boolean;
  title: string;
  message: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, busy, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <div className="w-[min(420px,90vw)] rounded-2xl bg-white p-6 text-stone-900 dark:bg-stone-900 dark:text-stone-100">
        <h2 id="confirm-title" className="font-serif text-xl">{title}</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2">Cancelar</button>
          <button type="button" disabled={busy} onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50">
            {busy ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
