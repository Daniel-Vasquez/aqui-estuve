import { authClient } from '@/lib/auth-client';

export default function LogoutButton() {
  return (
    <button
      type="button"
      className="text-sm text-stone-600 hover:underline dark:text-stone-300"
      onClick={async () => {
        await authClient.signOut();
        window.location.assign('/admin/login');
      }}
    >
      Salir
    </button>
  );
}
