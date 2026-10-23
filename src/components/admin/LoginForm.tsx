import { useState, type SubmitEvent } from 'react';
import { authClient } from '@/lib/auth-client';

export default function LoginForm({ next = '/admin' }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
      rememberMe: true,
    });
    setLoading(false);
    if (error) {
      setError(error.status === 429 ? 'Demasiados intentos. Espera un minuto.' : 'Credenciales incorrectas.');
      return;
    }
    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 flex max-w-sm flex-col gap-4">
      <h1 className="font-serif text-3xl">Acceso</h1>
      <input name="email" type="email" required autoComplete="username" placeholder="Correo"
        className="rounded-lg border border-stone-300 bg-transparent px-3 py-2 dark:border-stone-700" />
      <input name="password" type="password" required autoComplete="current-password" placeholder="Contraseña"
        className="rounded-lg border border-stone-300 bg-transparent px-3 py-2 dark:border-stone-700" />
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button disabled={loading}
        className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
