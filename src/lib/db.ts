import { MongoClient, type Db } from 'mongodb';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __aquiEstuveMongo: MongoClient | undefined;
}

// Una sola instancia por proceso (sobrevive al HMR de Vite en dev y a las
// invocaciones "en caliente" de una función de Vercel).
// El driver conecta de forma perezosa en la primera operación.
export const client: MongoClient = (globalThis.__aquiEstuveMongo ??= new MongoClient(env('MONGODB_URI'), {
  appName: 'aqui-estuve',
  maxPoolSize: 10,
}));

export const db: Db = client.db(env('MONGODB_DB', 'aqui_estuve'));

export async function pingDb(): Promise<boolean> {
  const res = await db.command({ ping: 1 });
  return res.ok === 1;
}
