const metaEnv: Record<string, string | undefined> =
  typeof import.meta.env === 'object' ? (import.meta.env as Record<string, string | undefined>) : {};

/** Lee una variable de entorno de servidor. Lanza si falta y no hay fallback. */
export function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? metaEnv[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`[env] Falta la variable de entorno ${key}. Revisa tu archivo .env`);
  }
  return value;
}

export const isProd = (process.env.NODE_ENV ?? metaEnv.MODE) === 'production';
