import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { client, db } from './db';
import { env, isProd } from './env';

export const ADMIN_EMAIL = env('ADMIN_EMAIL').trim().toLowerCase();
const BASE_URL = env('BETTER_AUTH_URL');

export const auth = betterAuth({
  appName: 'Aquí Estuve',
  baseURL: BASE_URL,
  basePath: '/api/auth',
  secret: env('BETTER_AUTH_SECRET'),
  trustedOrigins: [BASE_URL],

  // Pasar `client` habilita transacciones (requiere replica set → Atlas OK).
  database: mongodbAdapter(db, {
    client,
    transaction: env('MONGODB_TRANSACTIONS', 'true') !== 'false',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: false,           // el seed no necesita crear sesión
    minPasswordLength: 12,
    maxPasswordLength: 128,
    // NO se define sendResetPassword → no hay flujo de recuperación.
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24,     // renueva la expiración como mucho 1 vez/día
    cookieCache: { enabled: true, maxAge: 60 * 5 }, // evita ir a Mongo en cada petición
  },

  rateLimit: { enabled: true, window: 60, max: 20 },

  advanced: {
    useSecureCookies: isProd,
  },

  databaseHooks: {
    user: {
      create: {
        // Candado del único administrador: aplica a cualquier vía de alta.
        before: async (user) => {
          if (user.email.trim().toLowerCase() !== ADMIN_EMAIL) {
            throw new APIError('FORBIDDEN', { message: 'El registro está deshabilitado.' });
          }
          const existing = await db.collection('user').countDocuments({}, { limit: 1 });
          if (existing > 0) {
            throw new APIError('FORBIDDEN', { message: 'El administrador ya existe.' });
          }
        },
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
