# Aquí Estuve — Planificación de Desarrollo

> Fotoblog / portafolio fotográfico personal con CMS privado en `/admin`.
> Documento de ejecución por **Tandas secuenciales**. Cada tanda es autocontenida: se ejecuta de principio a fin, se verifica con su checklist y solo entonces se pasa a la siguiente.

---

## 0. Cómo usar este documento

1. Antes de cada tanda, revisa la sección **"Variables de Entorno Requeridas"** y rellénalas en `.env` (copiado de `.env.example`).
2. Ejecuta los comandos de **"Dependencias a Instalar"** tal cual.
3. Crea/modifica exactamente los archivos listados. El código de referencia es **normativo** en lo que respecta a imports, firmas de librerías y contratos de API; el estilo visual (clases Tailwind) puede ajustarse.
4. No avances sin marcar todo el **Checklist** de la tanda.
5. Si una versión de librería instalada difiere de la fijada aquí y rompe algo, se fija la versión indicada en la tabla de la sección 1.2.

---

## 1. Visión General de la Arquitectura

### 1.1 Decisiones clave

| Tema | Decisión | Motivo |
|---|---|---|
| Render / Hosting | Astro `output: 'server'` + `@astrojs/vercel` (funciones serverless, runtime Node 24) | SSR, endpoints de API y middleware con sesión. Despliegue en Vercel desde la rama `main`. |
| Islas | React solo donde hay interactividad: `ThemeToggle`, `Gallery` (+ `Lightbox`, `LikeButton`), `LoginForm`, `AdminDashboard` | El resto es HTML servidor sin JS. |
| Estilos | Tailwind CSS v4 vía `@tailwindcss/vite`, dark mode por clase `.dark` en `<html>` | Lo instala `astro add tailwind`; el variant `dark:` se redefine a clase para permitir alternar manualmente. |
| BD | Driver oficial `mongodb` con *singleton* en `globalThis` | Reutiliza el pool entre peticiones y entre recargas HMR en dev. |
| Auth | `better-auth` + `@better-auth/mongo-adapter`, solo `emailAndPassword` | Sin verificación de correo, sin 2FA, sin reset. Cookies HTTP-only. |
| Único admin | **Triple candado**: (1) `databaseHooks.user.create.before` rechaza cualquier email ≠ `ADMIN_EMAIL` y cualquier alta si ya existe un usuario; (2) el middleware devuelve 403 a toda petición HTTP a `/api/auth/sign-up/*`; (3) la cuenta se crea con `npm run seed:admin`, que llama a `auth.api.signUpEmail` directamente (sin pasar por HTTP). | No se usa `disableSignUp: true` porque en better-auth 1.7 también bloquea la llamada server-side del seed. |
| Imágenes | **Subida firmada directa**: el servidor (SDK `cloudinary` v2) firma los parámetros en `POST /api/admin/upload-signature`; el navegador sube el archivo directo a Cloudinary; luego `POST /api/photos` recibe solo `publicId` + metadatos y el servidor **verifica** el recurso con `cloudinary.api.resource()` antes de guardarlo | Vercel limita el body de una función a **4,5 MB**: las fotos HD no pueden pasar por el servidor. El `API_SECRET` nunca sale del servidor y los datos de la imagen (dimensiones, formato, peso) vienen de Cloudinary, no del cliente. |
| URLs de entrega | Derivadas de `imageUrl` guardada insertando transformaciones tras `/image/upload/` | Helper isomórfico (sirve en cliente y servidor) sin exponer `CLOUDINARY_CLOUD_NAME`. |
| Likes | Colección `likes` con índice único `{ photoId, ipHash }`, `ipHash = HMAC-SHA256(LIKES_IP_SALT, ip)`; comportamiento **toggle** | Nunca se guarda la IP en claro; el índice único hace imposible duplicar aun con peticiones concurrentes. |
| Descarga | `fl_attachment:<slug>` sobre la URL original (sin `q_auto`/`f_auto`) | Cloudinary responde con `Content-Disposition: attachment` y el archivo original en máxima calidad. |
| Validación | `zod` v4 en todos los endpoints de entrada | Errores 400 uniformes. |
| CSRF | `security.checkOrigin: true` de Astro + `trustedOrigins` de Better Auth | Peticiones de mutación desde otro origen → 403. |

### 1.2 Versiones de referencia (verificadas el 2026-10-22)

| Paquete | Versión |
|---|---|
| Node.js | ≥ 22.23 (requisito de Astro 7) — local: v26 ✔ · Vercel: Node 24 (lo elige el adaptador) |
| `astro` | 7.4.x |
| `@astrojs/vercel` | 11.0.x |
| `@astrojs/react` | 7.1.x |
| `tailwindcss` / `@tailwindcss/vite` | 4.3.x |
| `mongodb` | 7.7.x |
| `better-auth` / `@better-auth/mongo-adapter` | 1.7.12 (deben ir **siempre a la misma versión**) |
| `cloudinary` | 2.11.x |
| `zod` | 4.6.x |
| `tsx` (dev) | 4.23.x |

### 1.3 Árbol final del proyecto

```
aqui-estuve/
├── .env.example
├── .env                         # (local, no se versiona)
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── planificacion.md
├── scripts/
│   ├── init-db.ts               # crea índices (Tanda 3, ampliado en Tanda 5)
│   └── seed-admin.ts            # crea la cuenta admin (Tanda 2)
├── public/
│   └── favicon.svg
└── src/
    ├── env.d.ts                 # tipos de App.Locals
    ├── middleware.ts            # protección /admin y mutaciones (Tanda 2)
    ├── styles/
    │   └── global.css
    ├── layouts/
    │   ├── BaseLayout.astro     # <head>, script anti-FOUC, header
    │   └── AdminLayout.astro
    ├── lib/
    │   ├── env.ts               # lectura de variables (Astro + scripts tsx)
    │   ├── db.ts                # MongoClient singleton
    │   ├── http.ts              # helpers de respuesta JSON
    │   ├── slug.ts              # slugify / nombre de archivo
    │   ├── auth.ts              # instancia Better Auth (server)
    │   ├── auth-client.ts       # cliente Better Auth (React)
    │   ├── cloudinary.ts        # SDK v2: upload/destroy (server)
    │   ├── cloudinary-url.ts    # transformaciones de URL (isomórfico)
    │   ├── likes.ts             # IP → hash, toggle (server)
    │   ├── api-client.ts        # fetch/XHR del navegador
    │   └── photos/
    │       ├── types.ts         # PhotoDoc, PhotoDTO, toDTO
    │       ├── schema.ts        # zod
    │       └── repository.ts    # acceso a la colección photos
    ├── hooks/
    │   └── useLikedPhotos.ts
    ├── components/
    │   ├── ThemeToggle.tsx
    │   ├── ui/
    │   │   └── Modal.tsx        # <dialog> nativo reutilizable
    │   ├── gallery/
    │   │   ├── Gallery.tsx
    │   │   ├── PhotoCard.tsx
    │   │   ├── Lightbox.tsx
    │   │   ├── LikeButton.tsx
    │   │   └── LocationLink.tsx
    │   └── admin/
    │       ├── LoginForm.tsx
    │       ├── LogoutButton.tsx
    │       ├── AdminDashboard.tsx
    │       ├── AdminPhotoCard.tsx
    │       ├── PhotoForm.tsx
    │       ├── TagInput.tsx
    │       └── ConfirmDialog.tsx
    └── pages/
        ├── index.astro
        ├── 404.astro
        ├── admin/
        │   ├── index.astro
        │   └── login.astro
        └── api/
            ├── health.ts
            ├── auth/
            │   └── [...all].ts
            ├── admin/
            │   └── upload-signature.ts  # POST (admin): firma subida a Cloudinary
            └── photos/
                ├── index.ts         # GET (público) · POST (admin)
                ├── [id].ts          # GET (público) · PUT · DELETE (admin)
                └── [id]/
                    └── like.ts      # POST (público, toggle)
```

### 1.4 Modelo de datos (MongoDB)

**Colección `photos`**

```ts
{
  _id: ObjectId,
  title: string,                 // 1–140
  slug: string,                  // "atardecer-en-cusco-a1b2c3" (único)
  description: string,           // 0–5000, puede ser ""
  tags: string[],                // categorías, minúsculas, sin duplicados, máx 20
  hashtags: string[],            // SIN '#', minúsculas, solo letras/números/_ , máx 30
  location: {                    // o null
    name: string,
    mapsUrl?: string,            // URL de Google Maps pegada por el admin
    lat?: number, lng?: number   // opcionales, van juntas
  } | null,
  imageUrl: string,              // secure_url de Cloudinary (original)
  publicId: string,              // "aqui-estuve/xyz123"
  width: number, height: number,
  format: string,                // "jpg" | "png" | "webp" | ...
  bytes: number,
  likesCount: number,            // contador desnormalizado (≥ 0)
  createdAt: Date,               // fecha de captura/publicación (editable)
  updatedAt: Date
}
```
Índices: `{ createdAt: -1, _id: -1 }`, `{ slug: 1 }` único, `{ publicId: 1 }` único, `{ tags: 1 }`, `{ hashtags: 1 }`.

**Colección `likes`**

```ts
{ _id: ObjectId, photoId: ObjectId, ipHash: string /* hex 64 */, createdAt: Date }
```
Índices: `{ photoId: 1, ipHash: 1 }` **único**, `{ ipHash: 1 }`.

**Colecciones de Better Auth** (las gestiona el adaptador, no se tocan a mano): `user`, `session`, `account`, `verification`.

### 1.5 Contrato de la API

| Método | Ruta | Acceso | Body | Respuesta |
|---|---|---|---|---|
| GET | `/api/health` | público | — | `{ ok: true, db: "up" }` |
| ALL | `/api/auth/*` | Better Auth | — | gestionado por Better Auth (`sign-up/*` bloqueado → 403) |
| GET | `/api/photos?cursor=<id>&limit=<n>` | público | — | `{ photos: PhotoDTO[], nextCursor: string \| null }` |
| POST | `/api/admin/upload-signature` | admin | — | `{ cloudName, apiKey, timestamp, signature, folder, allowedFormats }` |
| POST | `/api/photos` | admin | JSON: `{ publicId, ...PhotoCreateInput }` (la imagen ya está en Cloudinary) | `201 { photo: PhotoDTO }` |
| GET | `/api/photos/:id` | público | — | `{ photo: PhotoDTO }` |
| PUT | `/api/photos/:id` | admin | JSON parcial (`PhotoUpdateInput`) | `{ photo: PhotoDTO }` |
| DELETE | `/api/photos/:id` | admin | — | `{ ok: true }` |
| POST | `/api/photos/:id/like` | público | — | `{ liked: boolean, likesCount: number }` |

Errores: siempre `{ error: string, details?: unknown }` con status 400/401/403/404/413/415/500/502.

---

## Tanda 1 — Inicialización, Tailwind, Tema Light/Dark y Conexión a MongoDB

### 1. Objetivo de la Tanda
Proyecto Astro 7 en modo SSR con adaptador de Vercel, React y Tailwind v4 funcionando; repositorio git en la rama `main`; layout base con alternancia de tema Light/Dark persistida y **sin parpadeo**; conexión singleton a MongoDB verificable mediante `GET /api/health`.

### 2. Variables de Entorno Requeridas (Acción del Usuario)
| Variable | De dónde sale |
|---|---|
| `SITE_URL` | `http://localhost:4321` en local. |
| `MONGODB_URI` | MongoDB Atlas → *Database* → **Connect** → *Drivers* → Node.js → copiar el connection string y reemplazar `<password>`. En *Network Access* añadir tu IP (o `0.0.0.0/0` temporalmente). |
| `MONGODB_DB` | Nombre libre, p. ej. `aqui_estuve`. |
| `MONGODB_TRANSACTIONS` | `true` con Atlas. `false` solo si usas un `mongod` local standalone. |

### 3. Dependencias a Instalar
```bash
# 1. Generar la plantilla en una carpeta temporal y copiarla a la raíz
#    (así no se pisan planificacion.md, .env.example ni .env)
npm create astro@latest /tmp/ae-scaffold -- --template minimal --no-install --no-git --yes
cp -R /tmp/ae-scaffold/{.gitignore,.vscode,AGENTS.md,astro.config.mjs,package.json,public,README.md,src,tsconfig.json} .
npm install

# 2. Integraciones y dependencias
npx astro add react tailwind vercel --yes
npm install mongodb zod
npm install -D tsx @types/node @astrojs/check typescript

# 3. npm 11+ bloquea scripts de instalación no revisados: aprobar los de Vite
npm install-scripts approve esbuild fsevents

# 4. Git en main
git init -b main
```
> Añadir `.vercel/` al `.gitignore` (lo genera la build). En Astro 7 solo puede haber **un** servidor de desarrollo a la vez: usar `npx astro dev --background` / `npx astro dev stop` / `npx astro dev logs`.

### 4. Archivos a Crear o Modificar
```
astro.config.mjs            (modificar)
tsconfig.json               (modificar: alias @/*)
package.json                (modificar: scripts)
.gitignore                  (verificar que incluye .env)
src/env.d.ts                (crear)
src/styles/global.css       (modificar)
src/lib/env.ts              (crear)
src/lib/db.ts               (crear)
src/lib/http.ts             (crear)
src/layouts/BaseLayout.astro(crear)
src/components/ThemeToggle.tsx (crear)
src/pages/index.astro       (modificar: placeholder)
src/pages/api/health.ts     (crear)
```

### 5. Especificación Técnica y Código de Referencia

**`astro.config.mjs`**
```js
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

const { SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');

export default defineConfig({
  site: SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  security: { checkOrigin: true },
  image: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
});
```

**`tsconfig.json`** (conservar lo que genere Astro y añadir `baseUrl`/`paths`)
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```
> Regla: **dentro de `src/lib/**` usar imports relativos** (`./db`), porque esos módulos también los importan los scripts de `scripts/` ejecutados con `tsx`. En páginas, componentes y endpoints se puede usar `@/`.

**`package.json`** → bloque `scripts`
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "db:init": "tsx --env-file=.env scripts/init-db.ts",
    "seed:admin": "tsx --env-file=.env scripts/seed-admin.ts"
  }
}
```
> `npm run build` genera `.vercel/output/` (formato Build Output API). No hay script `start`: en producción ejecuta Vercel.

**`src/lib/env.ts`** — funciona tanto dentro de Astro (`import.meta.env`) como en scripts `tsx` / producción (`process.env`).
```ts
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
```

**`src/lib/db.ts`** — Singleton.
```ts
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
```

**`src/lib/http.ts`**
```ts
export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function jsonError(status: number, error: string, details?: unknown): Response {
  return json(details === undefined ? { error } : { error, details }, status);
}
```

**`src/pages/api/health.ts`**
```ts
import type { APIRoute } from 'astro';
import { pingDb } from '@/lib/db';
import { json, jsonError } from '@/lib/http';

export const GET: APIRoute = async () => {
  try {
    await pingDb();
    return json({ ok: true, db: 'up' });
  } catch (err) {
    console.error('[health]', err);
    return jsonError(503, 'Base de datos no disponible');
  }
};
```

**`src/styles/global.css`**
```css
@import "tailwindcss";

/* Dark mode por clase en <html>, no por media query */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Fraunces", ui-serif, Georgia, serif;
}

@layer base {
  html { @apply bg-stone-50 text-stone-900 antialiased; }
  html.dark { @apply bg-stone-950 text-stone-100; }
}
```

**`src/layouts/BaseLayout.astro`** — el script inline debe ser el **primer** hijo ejecutable del `<head>` para evitar FOUC.
```astro
---
import '@/styles/global.css';
import ThemeToggle from '@/components/ThemeToggle';

interface Props {
  title?: string;
  description?: string;
  image?: string;
}
const {
  title = 'Aquí Estuve',
  description = 'Fotografías de los lugares donde estuve.',
  image,
} = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script is:inline>
      (() => {
        let stored = null;
        try { stored = localStorage.getItem('theme'); } catch {}
        const dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        const root = document.documentElement;
        root.classList.toggle('dark', dark);
        root.style.colorScheme = dark ? 'dark' : 'light';
      })();
    </script>
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    {image && <meta property="og:image" content={image} />}
    <slot name="head" />
  </head>
  <body class="min-h-dvh font-sans">
    <header class="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
      <a href="/" class="font-serif text-2xl tracking-tight">Aquí Estuve</a>
      <ThemeToggle client:load />
    </header>
    <main class="mx-auto max-w-7xl px-4 pb-16">
      <slot />
    </main>
  </body>
</html>
```

**`src/components/ThemeToggle.tsx`**
```tsx
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Lee el estado real que ya aplicó el script inline (evita mismatch de hidratación).
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.toggle('dark', next === 'dark');
    root.style.colorScheme = next;
    try { localStorage.setItem('theme', next); } catch {}
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="rounded-full p-2 text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
    >
      {/* Antes de hidratar (theme === null) se renderiza un hueco del mismo tamaño */}
      <span aria-hidden className="block size-5 text-center leading-5">
        {theme === null ? '' : theme === 'dark' ? '☀' : '☾'}
      </span>
    </button>
  );
}
```

**`src/env.d.ts`** (en esta tanda solo la referencia; `Locals` se añade en la Tanda 2)
```ts
/// <reference types="astro/client" />
```

**`src/pages/index.astro`** (placeholder)
```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout>
  <p class="text-stone-500 dark:text-stone-400">La galería llegará en la Tanda 5.</p>
</BaseLayout>
```

### 6. Criterio de Verificación (Checklist)
- [ ] `npm run dev` arranca sin errores en `http://localhost:4321`.
- [ ] `curl -s http://localhost:4321/api/health` → `{"ok":true,"db":"up"}`.
- [ ] Con una URI errónea en `.env`, `/api/health` responde **503** (y se restaura la correcta).
- [ ] El botón de tema alterna claro/oscuro y al recargar se mantiene la elección (`localStorage.theme`).
- [ ] Borrando `localStorage.theme` y cambiando el tema del SO, la página sigue a `prefers-color-scheme`.
- [ ] Con *DevTools → Network → Slow 3G* y tema oscuro, al recargar **no** hay destello blanco.
- [ ] `npx astro check` sin errores de tipos.
- [ ] `npm run build` termina con `[@astrojs/vercel] Bundling function` y crea `.vercel/output/functions/_render.func`.
- [ ] `git branch --show-current` → `main`.

---

## Tanda 2 — Better Auth, Único Administrador y Middleware de Protección

### 1. Objetivo de la Tanda
Login de administrador por email/contraseña con cookies HTTP-only; imposibilidad de registrar cuentas ajenas; cuenta del admin creada vía script; todas las rutas `/admin/*` (salvo `/admin/login`) y las mutaciones de `/api/photos` protegidas por `src/middleware.ts`. Página `/admin` mínima con botón de cerrar sesión.

### 2. Variables de Entorno Requeridas (Acción del Usuario)
| Variable | De dónde sale |
|---|---|
| `BETTER_AUTH_SECRET` | Ejecuta `openssl rand -base64 32` y pega el resultado. |
| `BETTER_AUTH_URL` | `http://localhost:4321` en local; tu dominio `https://…` en producción. |
| `ADMIN_EMAIL` | Tu correo (será el único aceptado). |
| `ADMIN_NAME` | Tu nombre visible. |
| `ADMIN_PASSWORD` | Contraseña ≥ 12 caracteres. Solo se usa al ejecutar `npm run seed:admin`; puedes borrarla del `.env` después. |

### 3. Dependencias a Instalar
```bash
npm install better-auth@1.7.12 @better-auth/mongo-adapter@1.7.12
```

### 4. Archivos a Crear o Modificar
```
src/lib/auth.ts                     (crear)
src/lib/auth-client.ts              (crear)
src/pages/api/auth/[...all].ts      (crear)
src/middleware.ts                   (crear)
src/env.d.ts                        (modificar: App.Locals)
scripts/seed-admin.ts               (crear)
src/layouts/AdminLayout.astro       (crear)
src/pages/admin/login.astro         (crear)
src/pages/admin/index.astro         (crear: versión mínima)
src/components/admin/LoginForm.tsx  (crear)
src/components/admin/LogoutButton.tsx (crear)
```

### 5. Especificación Técnica y Código de Referencia

**`src/lib/auth.ts`**
```ts
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
```
> ⚠ No usar `emailAndPassword.disableSignUp: true`: en 1.7 la comprobación vive dentro del endpoint y también bloquearía `auth.api.signUpEmail` del seed.

**`src/pages/api/auth/[...all].ts`**
```ts
import type { APIRoute } from 'astro';
import { auth } from '@/lib/auth';

export const ALL: APIRoute = ({ request }) => auth.handler(request);
```

**`src/lib/auth-client.ts`**
```ts
import { createAuthClient } from 'better-auth/react';

// Mismo origen: baseURL se infiere de window.location; basePath por defecto /api/auth.
export const authClient = createAuthClient();
```

**`src/env.d.ts`**
```ts
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('./lib/auth').AuthSession['user'] | null;
    session: import('./lib/auth').AuthSession['session'] | null;
  }
}
```

**`src/middleware.ts`**
```ts
import { defineMiddleware } from 'astro:middleware';
import { auth, ADMIN_EMAIL } from '@/lib/auth';
import { jsonError } from '@/lib/http';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Endpoints de Better Auth que NUNCA deben estar disponibles vía HTTP.
const BLOCKED_AUTH_PREFIXES = [
  '/api/auth/sign-up',
  '/api/auth/delete-user',
  '/api/auth/change-email',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password',
];

const LIKE_ROUTE = /^\/api\/photos\/[^/]+\/like\/?$/;

function isAdminPage(p: string) {
  return p === '/admin' || p.startsWith('/admin/');
}
function isLoginPage(p: string) {
  return p === '/admin/login' || p === '/admin/login/';
}
function isProtectedApi(p: string, method: string) {
  if (!MUTATING.has(method)) return false;
  if (LIKE_ROUTE.test(p)) return false;                 // likes son públicos
  return p === '/api/photos' || p.startsWith('/api/photos/') || p.startsWith('/api/admin/');
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  const method = ctx.request.method.toUpperCase();
  ctx.locals.user = null;
  ctx.locals.session = null;

  if (BLOCKED_AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return jsonError(403, 'Operación no permitida');
  }

  const adminPage = isAdminPage(pathname);
  const protectedApi = isProtectedApi(pathname, method);

  // Solo consultamos la sesión donde importa (ahorra trabajo en la galería pública).
  if (adminPage || protectedApi) {
    const result = await auth.api.getSession({ headers: ctx.request.headers });
    if (result && result.user.email.toLowerCase() === ADMIN_EMAIL) {
      ctx.locals.user = result.user;
      ctx.locals.session = result.session;
    }
  }
  const isAdmin = ctx.locals.user !== null;

  if (protectedApi && !isAdmin) return jsonError(401, 'No autorizado');

  if (adminPage) {
    if (isLoginPage(pathname)) {
      if (isAdmin) return ctx.redirect('/admin');
    } else if (!isAdmin) {
      return ctx.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }

  const response = await next();
  if (adminPage) response.headers.set('Cache-Control', 'no-store');
  return response;
});
```

**`scripts/seed-admin.ts`**
```ts
import { auth, ADMIN_EMAIL } from '../src/lib/auth';
import { client, db } from '../src/lib/db';

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrador';
  if (!password) throw new Error('Define ADMIN_PASSWORD en .env para ejecutar el seed.');

  const existing = await db.collection('user').findOne({});
  if (existing) {
    console.log(`ℹ Ya existe un usuario (${existing.email}). No se crea ninguno nuevo.`);
    return;
  }

  // Llamada directa (no HTTP): el middleware no interviene; el hook valida ADMIN_EMAIL.
  await auth.api.signUpEmail({ body: { email: ADMIN_EMAIL, password, name } });
  console.log(`✔ Administrador creado: ${ADMIN_EMAIL}`);
  console.log('  Ya puedes borrar ADMIN_PASSWORD de tu .env');
}

main()
  .catch((err) => {
    console.error('✖ Error en seed:', err);
    process.exitCode = 1;
  })
  .finally(() => client.close());
```

**`src/layouts/AdminLayout.astro`**
```astro
---
import '@/styles/global.css';
import ThemeToggle from '@/components/ThemeToggle';
import LogoutButton from '@/components/admin/LogoutButton';

interface Props { title?: string }
const { title = 'Admin · Aquí Estuve' } = Astro.props;
const user = Astro.locals.user;
---
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <script is:inline>
      (() => {
        let s = null; try { s = localStorage.getItem('theme'); } catch {}
        const d = s ? s === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', d);
        document.documentElement.style.colorScheme = d ? 'dark' : 'light';
      })();
    </script>
    <title>{title}</title>
  </head>
  <body class="min-h-dvh font-sans">
    <header class="border-b border-stone-200 dark:border-stone-800">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <a href="/admin" class="font-serif text-xl">Aquí Estuve · CMS</a>
        <div class="flex items-center gap-3">
          <a href="/" class="text-sm underline-offset-4 hover:underline">Ver sitio</a>
          <ThemeToggle client:load />
          {user && <LogoutButton client:load />}
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-8"><slot /></main>
  </body>
</html>
```

**`src/components/admin/LoginForm.tsx`**
```tsx
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

export default function LoginForm({ next = '/admin' }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
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
```

**`src/components/admin/LogoutButton.tsx`**
```tsx
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
```

**`src/pages/admin/login.astro`**
```astro
---
import AdminLayout from '@/layouts/AdminLayout.astro';
import LoginForm from '@/components/admin/LoginForm';

// Evita open-redirect: solo rutas internas de /admin.
const raw = Astro.url.searchParams.get('next') ?? '/admin';
const next = raw.startsWith('/admin') && !raw.startsWith('//') ? raw : '/admin';
---
<AdminLayout title="Acceso · Aquí Estuve">
  <LoginForm client:load next={next} />
</AdminLayout>
```

**`src/pages/admin/index.astro`** (mínimo; se completa en Tanda 4)
```astro
---
import AdminLayout from '@/layouts/AdminLayout.astro';
const user = Astro.locals.user!;
---
<AdminLayout>
  <h1 class="font-serif text-3xl">Hola, {user.name}</h1>
  <p class="mt-2 text-stone-500">Sesión activa como {user.email}.</p>
</AdminLayout>
```

### 6. Criterio de Verificación (Checklist)
- [ ] `npm run seed:admin` imprime `✔ Administrador creado`. Ejecutarlo de nuevo imprime `ℹ Ya existe un usuario`.
- [ ] En Atlas existen las colecciones `user` y `account` con un único documento cada una (la contraseña está hasheada en `account.password`).
- [ ] `http://localhost:4321/admin` sin sesión → redirige a `/admin/login?next=%2Fadmin`.
- [ ] Login con credenciales incorrectas → mensaje de error; con las correctas → `/admin` muestra tu nombre.
- [ ] DevTools → Application → Cookies: existe `better-auth.session_token` con **HttpOnly ✔**.
- [ ] Visitar `/admin/login` con sesión activa → redirige a `/admin`.
- [ ] "Salir" elimina la cookie y vuelve al login.
- [ ] Registro público bloqueado:
  ```bash
  curl -i -X POST http://localhost:4321/api/auth/sign-up/email \
    -H 'Content-Type: application/json' -H 'Origin: http://localhost:4321' \
    -d '{"email":"intruso@x.com","password":"123456789012","name":"x"}'
  # → HTTP/1.1 403
  ```
- [ ] Mutación sin sesión bloqueada: `curl -i -X DELETE http://localhost:4321/api/photos/123 -H 'Origin: http://localhost:4321'` → **401**.

---

## Tanda 3 — Integración con Cloudinary y Endpoints CRUD

### 1. Objetivo de la Tanda
Helpers de Cloudinary (firma de subida, verificación, borrado, URLs transformadas), capa de datos tipada para `photos` con validación zod, índices de BD y endpoints REST completos (`POST /api/admin/upload-signature`, `GET/POST /api/photos`, `GET/PUT/DELETE /api/photos/:id`) probados con `curl`.

**Flujo de subida (compatible con el límite de 4,5 MB de Vercel):**
```
Navegador ──POST /api/admin/upload-signature──▶ Servidor   (firma timestamp+folder+allowed_formats)
Navegador ──POST multipart (archivo)──────────▶ api.cloudinary.com   (directo, sin pasar por Vercel)
Navegador ──POST /api/photos {publicId,…}─────▶ Servidor ──api.resource(publicId)──▶ Cloudinary
                                                  └─ valida carpeta/peso, guarda en MongoDB
```

### 2. Variables de Entorno Requeridas (Acción del Usuario)
| Variable | De dónde sale |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | [console.cloudinary.com](https://console.cloudinary.com) → *Settings* (⚙) → **API Keys** (también visible en el Dashboard). |
| `CLOUDINARY_API_KEY` | Mismo lugar. |
| `CLOUDINARY_API_SECRET` | Mismo lugar (botón "reveal"). |
| `CLOUDINARY_FOLDER` | Nombre libre, p. ej. `aqui-estuve`. |
| `UPLOAD_MAX_MB` | `10` en plan gratuito (límite de Cloudinary por imagen). Se comprueba en el navegador antes de subir y en el servidor al registrar (si se supera, la imagen se borra de Cloudinary). |

> En Cloudinary → *Settings → Security*, comprobar que **"Strict transformations" está desactivado** (valor por defecto). Si estuviera activo, las URLs con `f_auto`, `w_…` o `fl_attachment` darían 401.

### 3. Dependencias a Instalar
```bash
npm install cloudinary
```

### 4. Archivos a Crear o Modificar
```
src/lib/slug.ts                     (crear)
src/lib/cloudinary.ts               (crear)
src/lib/cloudinary-url.ts           (crear)
src/lib/photos/types.ts             (crear)
src/lib/photos/schema.ts            (crear)
src/lib/photos/repository.ts        (crear)
src/pages/api/admin/upload-signature.ts (crear)
src/pages/api/photos/index.ts       (crear)
src/pages/api/photos/[id].ts        (crear)
scripts/init-db.ts                  (crear)
```

### 5. Especificación Técnica y Código de Referencia

**`src/lib/slug.ts`**
```ts
/** "Atardecer en Cusco ☀️" → "atardecer-en-cusco" */
export function slugify(input: string, maxLength = 60): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/** Nombre seguro para fl_attachment (sin puntos, comas ni barras). */
export function toFileSlug(title: string): string {
  return slugify(title, 80) || 'aqui-estuve-foto';
}
```

**`src/lib/cloudinary.ts`** (solo servidor)
```ts
import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

const CLOUD_NAME = env('CLOUDINARY_CLOUD_NAME');
const API_KEY = env('CLOUDINARY_API_KEY');
const API_SECRET = env('CLOUDINARY_API_SECRET');

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET, secure: true });

export const FOLDER = env('CLOUDINARY_FOLDER', 'aqui-estuve');
export const MAX_BYTES = Number(env('UPLOAD_MAX_MB', '10')) * 1024 * 1024;
const ALLOWED_FORMATS = 'jpg,png,webp,avif,heic';

/** Datos de la imagen tal como los reporta Cloudinary (fuente de verdad, no el cliente). */
export interface CloudinaryImage {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Firma una subida directa navegador → Cloudinary.
 * El navegador debe enviar EXACTAMENTE estos parámetros (timestamp, folder,
 * allowed_formats) + api_key + signature + file; si cambia cualquiera, Cloudinary rechaza.
 * La firma caduca a la hora (Cloudinary valida el timestamp).
 */
export function signUpload() {
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder: FOLDER, allowed_formats: ALLOWED_FORMATS };
  const signature = cloudinary.utils.api_sign_request(params, API_SECRET);
  return {
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    timestamp,
    signature,
    folder: FOLDER,
    allowedFormats: ALLOWED_FORMATS,
  };
}

/** Consulta el recurso en la Admin API. Devuelve null si no existe. */
export async function getImage(publicId: string): Promise<CloudinaryImage | null> {
  try {
    const r = await cloudinary.api.resource(publicId, { resource_type: 'image' });
    return {
      public_id: r.public_id,
      secure_url: r.secure_url,
      width: r.width,
      height: r.height,
      format: r.format,
      bytes: r.bytes,
    };
  } catch (err: unknown) {
    const code = (err as { error?: { http_code?: number } })?.error?.http_code;
    if (code === 404) return null;
    throw err;
  }
}

/** Devuelve true si el recurso quedó eliminado (o ya no existía). */
export async function destroyImage(publicId: string): Promise<boolean> {
  const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  return res.result === 'ok' || res.result === 'not found';
}
```

**`src/lib/cloudinary-url.ts`** (isomórfico — se usa también en React)
```ts
import { toFileSlug } from './slug';

const MARKER = '/image/upload/';

/** Inserta una cadena de transformación justo después de /image/upload/. */
export function withTransform(url: string, transformation: string): string {
  const i = url.indexOf(MARKER);
  if (i === -1) return url;
  const at = i + MARKER.length;
  return `${url.slice(0, at)}${transformation}/${url.slice(at)}`;
}

/** Miniatura del grid: optimizada con f_auto,q_auto. */
export const thumbUrl = (url: string, width = 800) =>
  withTransform(url, `c_limit,w_${width},f_auto,q_auto`);

export const thumbSrcSet = (url: string) =>
  [400, 800, 1200, 1600].map((w) => `${thumbUrl(url, w)} ${w}w`).join(', ');

/** Imagen grande del lightbox. */
export const lightboxUrl = (url: string) =>
  withTransform(url, 'c_limit,w_2400,h_2400,f_auto,q_auto:good');

/** Original en máxima calidad + Content-Disposition: attachment; filename=<slug>.<ext> */
export const downloadUrl = (url: string, title: string) =>
  withTransform(url, `fl_attachment:${toFileSlug(title)}`);

/** Imagen para Open Graph / redes. */
export const ogImageUrl = (url: string) =>
  withTransform(url, 'c_fill,g_auto,w_1200,h_630,f_jpg,q_auto');
```

**`src/lib/photos/types.ts`**
```ts
import type { ObjectId, WithId } from 'mongodb';

export interface PhotoLocation {
  name: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
}

export interface PhotoDoc {
  _id: ObjectId;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  hashtags: string[];
  location: PhotoLocation | null;
  imageUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Forma serializable que viaja al cliente (props de islas y JSON de la API). */
export interface PhotoDTO extends Omit<PhotoDoc, '_id' | 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt: string;
  updatedAt: string;
  likedByMe?: boolean;
}

export function toDTO(doc: WithId<PhotoDoc> | PhotoDoc, likedByMe?: boolean): PhotoDTO {
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return {
    ...rest,
    id: _id.toHexString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    ...(likedByMe === undefined ? {} : { likedByMe }),
  };
}

/** Enlace a Google Maps a partir de la ubicación (sin API key). */
export function mapsHref(loc: PhotoLocation): string {
  if (loc.mapsUrl) return loc.mapsUrl;
  const q = loc.lat !== undefined && loc.lng !== undefined ? `${loc.lat},${loc.lng}` : loc.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
```
> `mapsHref` no importa nada de servidor (el `import type` desaparece al compilar), así que puede usarse en React.

**`src/lib/photos/schema.ts`**
```ts
import { z } from 'zod';

const dedupe = (arr: string[]) => [...new Set(arr)];

const tags = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((arr) => dedupe(arr.map((t) => t.toLowerCase())));

const hashtags = z
  .array(z.string())
  .max(30)
  .transform((arr) =>
    dedupe(
      arr
        .map((h) => h.trim().replace(/^#+/, '').toLowerCase())
        .filter((h) => /^[\p{L}\p{N}_]{1,50}$/u.test(h)),
    ),
  );

export const locationSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    mapsUrl: z
      .url()
      .max(2048)
      .refine((u) => /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/.test(u), {
        message: 'Debe ser un enlace de Google Maps',
      })
      .optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .refine((l) => (l.lat === undefined) === (l.lng === undefined), {
    message: 'lat y lng deben indicarse juntas',
  });

const base = {
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(5000),
  tags,
  hashtags,
  location: locationSchema.nullable(),
  createdAt: z.coerce.date(),
};

export const photoCreateSchema = z.object({
  publicId: z.string().trim().min(1).max(255),  // devuelto por Cloudinary tras la subida directa
  title: base.title,
  description: base.description.default(''),
  tags: base.tags.default([]),
  hashtags: base.hashtags.default([]),
  location: base.location.default(null),
  createdAt: base.createdAt.optional(),        // si falta → ahora
});

export const photoUpdateSchema = z
  .object(base)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Nada que actualizar' });

export type PhotoCreateInput = z.infer<typeof photoCreateSchema>;
export type PhotoUpdateInput = z.infer<typeof photoUpdateSchema>;
```

**`src/lib/photos/repository.ts`**
```ts
import { ObjectId, type Filter } from 'mongodb';
import type { CloudinaryImage } from '../cloudinary';
import { db } from '../db';
import { slugify } from '../slug';
import type { PhotoDoc } from './types';
import type { PhotoCreateInput, PhotoUpdateInput } from './schema';

export const photosCol = () => db.collection<PhotoDoc>('photos');

export function parseObjectId(id: string | undefined): ObjectId | null {
  return id && ObjectId.isValid(id) && /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

const buildSlug = (title: string, id: ObjectId) =>
  `${slugify(title) || 'foto'}-${id.toHexString().slice(-6)}`;

export async function listPhotos({ limit = 24, cursor }: { limit?: number; cursor?: string | null }) {
  const safeLimit = Math.min(Math.max(limit, 1), 60);
  const filter: Filter<PhotoDoc> = {};

  if (cursor) {
    const cursorId = parseObjectId(cursor);
    const ref = cursorId ? await photosCol().findOne({ _id: cursorId }, { projection: { createdAt: 1 } }) : null;
    if (ref) {
      filter.$or = [
        { createdAt: { $lt: ref.createdAt } },
        { createdAt: ref.createdAt, _id: { $lt: ref._id } },
      ];
    }
  }

  const docs = await photosCol()
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(safeLimit + 1)
    .toArray();

  const hasMore = docs.length > safeLimit;
  const page = hasMore ? docs.slice(0, safeLimit) : docs;
  return { photos: page, nextCursor: hasMore ? page[page.length - 1]._id.toHexString() : null };
}

export const getPhoto = (id: ObjectId) => photosCol().findOne({ _id: id });

export const findByPublicId = (publicId: string) => photosCol().findOne({ publicId });

export async function createPhoto(input: PhotoCreateInput, image: CloudinaryImage): Promise<PhotoDoc> {
  const _id = new ObjectId();
  const now = new Date();
  const doc: PhotoDoc = {
    _id,
    title: input.title,
    slug: buildSlug(input.title, _id),
    description: input.description,
    tags: input.tags,
    hashtags: input.hashtags,
    location: input.location,
    imageUrl: image.secure_url,
    publicId: image.public_id,
    width: image.width,
    height: image.height,
    format: image.format,
    bytes: image.bytes,
    likesCount: 0,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  await photosCol().insertOne(doc);
  return doc;
}

export async function updatePhoto(id: ObjectId, input: PhotoUpdateInput) {
  const $set: Partial<PhotoDoc> = { ...input, updatedAt: new Date() };
  if (input.title) $set.slug = buildSlug(input.title, id);
  return photosCol().findOneAndUpdate({ _id: id }, { $set }, { returnDocument: 'after' });
}

export async function deletePhotoDoc(id: ObjectId) {
  await photosCol().deleteOne({ _id: id });
  await db.collection('likes').deleteMany({ photoId: id });
}
```
> En el driver `mongodb` v6+/v7, `findOneAndUpdate` devuelve **el documento directamente** (o `null`), no `{ value }`.

**`src/pages/api/admin/upload-signature.ts`** (protegido por middleware: `/api/admin/*` + `POST`)
```ts
import type { APIRoute } from 'astro';
import { json } from '@/lib/http';
import { signUpload } from '@/lib/cloudinary';

export const POST: APIRoute = () => json(signUpload());
```

**`src/pages/api/photos/index.ts`**
```ts
import type { APIRoute } from 'astro';
import { MongoServerError } from 'mongodb';
import { json, jsonError } from '@/lib/http';
import { FOLDER, MAX_BYTES, destroyImage, getImage } from '@/lib/cloudinary';
import { photoCreateSchema } from '@/lib/photos/schema';
import { createPhoto, findByPublicId, listPhotos } from '@/lib/photos/repository';
import { toDTO } from '@/lib/photos/types';

export const GET: APIRoute = async ({ url }) => {
  const limit = Number(url.searchParams.get('limit') ?? 24) || 24;
  const cursor = url.searchParams.get('cursor');
  const { photos, nextCursor } = await listPhotos({ limit, cursor });
  return json({ photos: photos.map((p) => toDTO(p)), nextCursor });
};

// Protegido por middleware (solo admin). La imagen YA está en Cloudinary (subida directa).
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'JSON inválido'); }

  const parsed = photoCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Datos inválidos', parsed.error.flatten());
  const { publicId } = parsed.data;

  // Solo se aceptan recursos de nuestra carpeta (evita registrar imágenes ajenas de la cuenta).
  if (!publicId.startsWith(`${FOLDER}/`)) return jsonError(400, 'publicId fuera de la carpeta permitida');
  if (await findByPublicId(publicId)) return jsonError(409, 'Esa imagen ya está publicada');

  let image;
  try {
    image = await getImage(publicId);
  } catch (err) {
    console.error('[photos:verify]', err);
    return jsonError(502, 'No se pudo verificar la imagen en Cloudinary');
  }
  if (!image) return jsonError(400, 'La imagen no existe en Cloudinary');

  if (image.bytes > MAX_BYTES) {
    await destroyImage(publicId).catch(() => {});
    return jsonError(413, `La imagen supera ${MAX_BYTES / 1024 / 1024} MB`);
  }

  try {
    const photo = await createPhoto(parsed.data, image);
    return json({ photo: toDTO(photo) }, 201);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      return jsonError(409, 'Esa imagen ya está publicada');   // carrera con el índice único de publicId
    }
    // Compensación: no dejar imágenes huérfanas en Cloudinary.
    await destroyImage(publicId).catch(() => {});
    console.error('[photos:create]', err);
    return jsonError(500, 'No se pudo guardar la publicación');
  }
};
```
> Imágenes huérfanas: si el admin sube a Cloudinary y cierra el formulario antes de guardar, la imagen queda en la carpeta sin publicación. Es raro y se limpia a mano desde la Media Library (o con un script futuro que compare `publicId` de Mongo con la carpeta).

**`src/pages/api/photos/[id].ts`**
```ts
import type { APIRoute } from 'astro';
import { json, jsonError } from '@/lib/http';
import { destroyImage } from '@/lib/cloudinary';
import { photoUpdateSchema } from '@/lib/photos/schema';
import { deletePhotoDoc, getPhoto, parseObjectId, updatePhoto } from '@/lib/photos/repository';
import { toDTO } from '@/lib/photos/types';

export const GET: APIRoute = async ({ params }) => {
  const id = parseObjectId(params.id);
  if (!id) return jsonError(400, 'ID inválido');
  const photo = await getPhoto(id);
  return photo ? json({ photo: toDTO(photo) }) : jsonError(404, 'No encontrada');
};

export const PUT: APIRoute = async ({ params, request }) => {
  const id = parseObjectId(params.id);
  if (!id) return jsonError(400, 'ID inválido');

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'JSON inválido'); }

  const parsed = photoUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Datos inválidos', parsed.error.flatten());

  const updated = await updatePhoto(id, parsed.data);
  return updated ? json({ photo: toDTO(updated) }) : jsonError(404, 'No encontrada');
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseObjectId(params.id);
  if (!id) return jsonError(400, 'ID inválido');

  const photo = await getPhoto(id);
  if (!photo) return jsonError(404, 'No encontrada');

  // 1) Cloudinary primero: si falla, la publicación se conserva y se puede reintentar.
  const destroyed = await destroyImage(photo.publicId).catch((err) => {
    console.error('[photos:destroy]', err);
    return false;
  });
  if (!destroyed) return jsonError(502, 'No se pudo eliminar la imagen en Cloudinary');

  // 2) MongoDB (documento + likes asociados).
  await deletePhotoDoc(id);
  return json({ ok: true });
};
```
> `PUT` no permite reemplazar la imagen (solo metadatos). Para cambiar la foto: eliminar y crear de nuevo.

**`scripts/init-db.ts`**
```ts
import { client, db } from '../src/lib/db';

async function main() {
  const photos = db.collection('photos');
  await photos.createIndexes([
    { key: { createdAt: -1, _id: -1 }, name: 'createdAt_desc' },
    { key: { slug: 1 }, name: 'slug_unique', unique: true },
    { key: { publicId: 1 }, name: 'publicId_unique', unique: true },
    { key: { tags: 1 }, name: 'tags' },
    { key: { hashtags: 1 }, name: 'hashtags' },
  ]);
  // (Tanda 5 añade aquí los índices de `likes`)
  console.log('✔ Índices creados');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => client.close());
```

### 6. Criterio de Verificación (Checklist)
Con `npm run dev` corriendo y una imagen `prueba.jpg` en la carpeta actual:
```bash
O='Origin: http://localhost:4321'
# 1. Login → guarda cookie
curl -s -c /tmp/ae.txt -H "$O" -H 'Content-Type: application/json' \
  -d '{"email":"TU_ADMIN_EMAIL","password":"TU_PASSWORD"}' \
  http://localhost:4321/api/auth/sign-in/email
# 2a. Pedir firma
SIG=$(curl -s -b /tmp/ae.txt -H "$O" -X POST http://localhost:4321/api/admin/upload-signature); echo "$SIG"
# 2b. Subir directo a Cloudinary con esa firma (requiere jq)
CLOUD=$(echo "$SIG" | jq -r .cloudName)
PUBLIC_ID=$(curl -s https://api.cloudinary.com/v1_1/$CLOUD/image/upload \
  -F file=@prueba.jpg -F api_key=$(echo "$SIG" | jq -r .apiKey) \
  -F timestamp=$(echo "$SIG" | jq -r .timestamp) -F signature=$(echo "$SIG" | jq -r .signature) \
  -F folder=$(echo "$SIG" | jq -r .folder) -F allowed_formats=$(echo "$SIG" | jq -r .allowedFormats) | jq -r .public_id)
echo "$PUBLIC_ID"
# 2c. Registrar la publicación
curl -s -b /tmp/ae.txt -H "$O" -H 'Content-Type: application/json' \
  -d "{\"publicId\":\"$PUBLIC_ID\",\"title\":\"Atardecer en Cusco\",\"description\":\"Prueba\",\"tags\":[\"Perú\",\"Viajes\"],\"hashtags\":[\"#Cusco\",\"andes\"],\"location\":{\"name\":\"Plaza de Armas, Cusco\"}}" \
  http://localhost:4321/api/photos
# 3. Listar
curl -s http://localhost:4321/api/photos | head -c 600
# 4. Editar (usa el id devuelto)
curl -s -b /tmp/ae.txt -H "$O" -X PUT -H 'Content-Type: application/json' \
  -d '{"title":"Atardecer en el Cusco"}' http://localhost:4321/api/photos/<ID>
# 5. Eliminar
curl -s -b /tmp/ae.txt -H "$O" -X DELETE http://localhost:4321/api/photos/<ID>
```
- [ ] `npm run db:init` → `✔ Índices creados` (visibles en Atlas → *Indexes*).
- [ ] (2a) devuelve `cloudName`, `apiKey`, `timestamp`, `signature`, `folder`, `allowedFormats` y **nunca** el `API_SECRET`.
- [ ] (2b) devuelve un `public_id` que empieza por `aqui-estuve/`. Cambiar `folder` en la petición → Cloudinary responde `Invalid Signature`.
- [ ] (2c) devuelve **201** con `imageUrl`, `publicId`, `width`, `height`, `format`, `tags: ["perú","viajes"]`, `hashtags: ["cusco","andes"]` y `slug` del tipo `atardecer-en-cusco-xxxxxx`. Repetir (2c) con el mismo `publicId` → **409**.
- [ ] La imagen aparece en Cloudinary → *Media Library* → carpeta `aqui-estuve`.
- [ ] Abrir en el navegador `thumbUrl(imageUrl)` (insertando `c_limit,w_800,f_auto,q_auto/` tras `/image/upload/`) sirve una imagen optimizada (en Chrome, *Network* muestra `content-type: image/avif` o `webp`).
- [ ] Insertando `fl_attachment:prueba/` el navegador **descarga** `prueba.jpg`.
- [ ] (4) actualiza título y `slug`; `updatedAt` cambia.
- [ ] (5) devuelve `{ ok: true }` y la imagen **desaparece de Cloudinary**.
- [ ] Sin cookie, (2a)/(2c)/(4)/(5) → **401**.
- [ ] En (2b), subir un `.gif` o un `.pdf` → Cloudinary lo rechaza (`allowed_formats`).
- [ ] (2c) con un `publicId` inventado → **400**; con un `publicId` de otra carpeta → **400**; sin `title` → **400** con `details`.

---

## Tanda 4 — Panel CMS en `/admin`

### 1. Objetivo de la Tanda
Panel privado con: grid de publicaciones, formulario de **creación** (arrastrar/seleccionar imagen con vista previa, barra de progreso de subida, título, descripción, etiquetas, hashtags, ubicación, fecha), **edición** de cualquier metadato en un modal y **eliminación** con confirmación (que borra también el archivo de Cloudinary).

### 2. Variables de Entorno Requeridas (Acción del Usuario)
Ninguna nueva.

### 3. Dependencias a Instalar
Ninguna nueva (todo con React + Tailwind + APIs nativas: `<dialog>`, `XMLHttpRequest` para el progreso de la subida directa a Cloudinary, `URL.createObjectURL`).

### 4. Archivos a Crear o Modificar
```
src/lib/api-client.ts                  (crear)
src/components/ui/Modal.tsx            (crear)
src/components/admin/TagInput.tsx      (crear)
src/components/admin/PhotoForm.tsx     (crear)
src/components/admin/AdminPhotoCard.tsx(crear)
src/components/admin/ConfirmDialog.tsx (crear)
src/components/admin/AdminDashboard.tsx(crear)
src/pages/admin/index.astro            (modificar)
```

### 5. Especificación Técnica y Código de Referencia

**`src/lib/api-client.ts`** (solo navegador)
```ts
import type { PhotoDTO } from './photos/types';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Error ${res.status}`, data.details);
  return data as T;
}

export interface PhotoMetadata {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  location: { name: string; mapsUrl?: string; lat?: number; lng?: number } | null;
  createdAt: string; // ISO
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
}

/** Sube el archivo DIRECTO a Cloudinary (XHR para tener progreso). Devuelve el public_id. */
function uploadToCloudinary(file: File, sig: UploadSignature, onProgress?: (pct: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', sig.apiKey);
    fd.append('timestamp', String(sig.timestamp));
    fd.append('signature', sig.signature);
    fd.append('folder', sig.folder);
    fd.append('allowed_formats', sig.allowedFormats);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = (() => { try { return JSON.parse(xhr.responseText); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300 && data.public_id) resolve(data.public_id);
      else reject(new ApiError(xhr.status, data.error?.message ?? 'Cloudinary rechazó la imagen'));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Error de red subiendo a Cloudinary'));
    xhr.send(fd);
  });
}

/** Firma → sube a Cloudinary → registra en /api/photos. */
export async function createPhoto(
  file: File,
  metadata: PhotoMetadata,
  { maxBytes, onProgress }: { maxBytes: number; onProgress?: (pct: number) => void },
) {
  if (file.size > maxBytes) throw new ApiError(413, `La imagen supera ${Math.round(maxBytes / 1024 / 1024)} MB`);
  const sig = await fetch('/api/admin/upload-signature', { method: 'POST' }).then((r) => handle<UploadSignature>(r));
  const publicId = await uploadToCloudinary(file, sig, onProgress);
  const { photo } = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId, ...metadata }),
  }).then((r) => handle<{ photo: PhotoDTO }>(r));
  return photo;
}

export const updatePhoto = (id: string, patch: Partial<PhotoMetadata>) =>
  fetch(`/api/photos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => handle<{ photo: PhotoDTO }>(r)).then((d) => d.photo);

export const deletePhoto = (id: string) =>
  fetch(`/api/photos/${id}`, { method: 'DELETE' }).then((r) => handle<{ ok: true }>(r));

export const fetchPhotos = (cursor?: string | null, limit = 24) =>
  fetch(`/api/photos?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`)
    .then((r) => handle<{ photos: PhotoDTO[]; nextCursor: string | null }>(r));

export const toggleLike = (id: string) =>
  fetch(`/api/photos/${id}/like`, { method: 'POST' })
    .then((r) => handle<{ liked: boolean; likesCount: number }>(r));
```

**`src/components/ui/Modal.tsx`** — envoltorio del `<dialog>` nativo (foco atrapado, `Esc`, capa superior gratis).
```tsx
import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}

export default function Modal({ open, onClose, children, className = '', labelledBy }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }} // clic en el backdrop
      className={`m-auto bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm ${className}`}
    >
      {open && children}
    </dialog>
  );
}
```

**`src/components/admin/TagInput.tsx`**
```tsx
import { useState, type KeyboardEvent } from 'react';

interface Props {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  prefix?: string;       // '#' para hashtags
  placeholder?: string;
}

export default function TagInput({ label, value, onChange, prefix = '', placeholder }: Props) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const items = raw.split(/[,\s]+/).map((s) => s.replace(/^#+/, '').trim()).filter(Boolean);
    if (items.length) onChange([...new Set([...value, ...items])]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft); }
    if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex flex-wrap gap-2 rounded-lg border border-stone-300 p-2 dark:border-stone-700">
        {value.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-stone-200 px-2 py-0.5 dark:bg-stone-800">
            {prefix}{t}
            <button type="button" aria-label={`Quitar ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && commit(draft)}
          placeholder={placeholder}
          className="min-w-32 flex-1 bg-transparent outline-none"
        />
      </div>
    </label>
  );
}
```

**`src/components/admin/PhotoForm.tsx`** — mismo componente para crear y editar.
```tsx
import { useEffect, useState, type FormEvent } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { ApiError, createPhoto, updatePhoto, type PhotoMetadata } from '@/lib/api-client';
import { thumbUrl } from '@/lib/cloudinary-url';
import TagInput from './TagInput';

interface Props {
  photo?: PhotoDTO;                 // presente = modo edición
  maxBytes: number;                 // UPLOAD_MAX_MB en bytes (lo pasa la página)
  onSaved: (p: PhotoDTO) => void;
  onCancel: () => void;
}

/** ISO → valor para <input type="datetime-local"> en hora local. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function PhotoForm({ photo, maxBytes, onSaved, onCancel }: Props) {
  const editing = Boolean(photo);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photo ? thumbUrl(photo.imageUrl, 800) : null);
  const [title, setTitle] = useState(photo?.title ?? '');
  const [description, setDescription] = useState(photo?.description ?? '');
  const [tags, setTags] = useState<string[]>(photo?.tags ?? []);
  const [hashtags, setHashtags] = useState<string[]>(photo?.hashtags ?? []);
  const [locName, setLocName] = useState(photo?.location?.name ?? '');
  const [mapsUrl, setMapsUrl] = useState(photo?.location?.mapsUrl ?? '');
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!editing && !file) return setError('Selecciona una imagen');

    const metadata: PhotoMetadata = {
      title,
      description,
      tags,
      hashtags,
      location: locName.trim() ? { name: locName.trim(), ...(mapsUrl.trim() ? { mapsUrl: mapsUrl.trim() } : {}) } : null,
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
        <TagInput label="Etiquetas" value={tags} onChange={setTags} placeholder="viajes, montaña…" />
        <TagInput label="Hashtags" prefix="#" value={hashtags} onChange={setHashtags} placeholder="#atardecer" />
        <input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Lugar (p. ej. Plaza de Armas, Cusco)" className={input} />
        <input type="url" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Enlace de Google Maps (opcional)" className={input} />
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
```

**`src/components/admin/ConfirmDialog.tsx`**
```tsx
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
```

**`src/components/admin/AdminPhotoCard.tsx`**
```tsx
import type { PhotoDTO } from '@/lib/photos/types';
import { thumbUrl } from '@/lib/cloudinary-url';

export default function AdminPhotoCard({ photo, onEdit, onDelete }: {
  photo: PhotoDTO; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
      <img src={thumbUrl(photo.imageUrl, 500)} alt={photo.title} width={photo.width} height={photo.height}
        loading="lazy" className="aspect-[4/3] w-full object-cover" />
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{photo.title}</h3>
          <p className="text-xs text-stone-500">
            {new Date(photo.createdAt).toLocaleDateString('es')} · ♥ {photo.likesCount}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-sm">
          <button type="button" onClick={onEdit} className="hover:underline">Editar</button>
          <button type="button" onClick={onDelete} className="text-red-600 hover:underline">Eliminar</button>
        </div>
      </div>
    </article>
  );
}
```

**`src/components/admin/AdminDashboard.tsx`**
```tsx
import { useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { ApiError, deletePhoto, fetchPhotos } from '@/lib/api-client';
import Modal from '@/components/ui/Modal';
import PhotoForm from './PhotoForm';
import AdminPhotoCard from './AdminPhotoCard';
import ConfirmDialog from './ConfirmDialog';

type Editor = { mode: 'create' } | { mode: 'edit'; photo: PhotoDTO } | null;

export default function AdminDashboard({ initialPhotos, initialCursor, maxBytes }: {
  initialPhotos: PhotoDTO[]; initialCursor: string | null; maxBytes: number;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [editor, setEditor] = useState<Editor>(null);
  const [toDelete, setToDelete] = useState<PhotoDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function onSaved(saved: PhotoDTO) {
    setPhotos((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      const next = exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
    setEditor(null);
    setNotice('Guardado ✔');
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePhoto(toDelete.id);
      setPhotos((prev) => prev.filter((p) => p.id !== toDelete.id));
      setNotice('Publicación eliminada');
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : 'Error eliminando');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  async function loadMore() {
    const { photos: more, nextCursor } = await fetchPhotos(cursor);
    setPhotos((prev) => [...prev, ...more]);
    setCursor(nextCursor);
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl">Publicaciones <span className="text-stone-400">({photos.length})</span></h1>
        <button type="button" onClick={() => setEditor({ mode: 'create' })}
          className="rounded-lg bg-stone-900 px-4 py-2 text-white dark:bg-stone-100 dark:text-stone-900">
          + Nueva
        </button>
      </div>

      {notice && <p role="status" className="mb-4 text-sm text-stone-600 dark:text-stone-300">{notice}</p>}

      {photos.length === 0 ? (
        <p className="py-24 text-center text-stone-500">Aún no hay fotos. Sube la primera.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((p) => (
            <AdminPhotoCard key={p.id} photo={p}
              onEdit={() => setEditor({ mode: 'edit', photo: p })}
              onDelete={() => setToDelete(p)} />
          ))}
        </div>
      )}

      {cursor && (
        <div className="mt-8 text-center">
          <button type="button" onClick={loadMore} className="underline">Cargar más</button>
        </div>
      )}

      <Modal open={editor !== null} onClose={() => setEditor(null)}>
        {editor && (
          <PhotoForm
            key={editor.mode === 'edit' ? editor.photo.id : 'new'}
            photo={editor.mode === 'edit' ? editor.photo : undefined}
            maxBytes={maxBytes}
            onSaved={onSaved}
            onCancel={() => setEditor(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        busy={deleting}
        title="¿Eliminar publicación?"
        message={`"${toDelete?.title ?? ''}" se borrará de la base de datos y de Cloudinary. No se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
```

**`src/pages/admin/index.astro`**
```astro
---
import AdminLayout from '@/layouts/AdminLayout.astro';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { listPhotos } from '@/lib/photos/repository';
import { toDTO } from '@/lib/photos/types';
import { MAX_BYTES } from '@/lib/cloudinary';

const { photos, nextCursor } = await listPhotos({ limit: 48 });
---
<AdminLayout>
  <AdminDashboard client:load initialPhotos={photos.map((p) => toDTO(p))} initialCursor={nextCursor} maxBytes={MAX_BYTES} />
</AdminLayout>
```

### 6. Criterio de Verificación (Checklist)
- [ ] `/admin` muestra el grid (o el estado vacío) y el botón **+ Nueva**.
- [ ] Crear: arrastrar una foto muestra la vista previa; la barra de progreso avanza; al guardar aparece la tarjeta en el grid sin recargar.
- [ ] En *Network* la subida del archivo va a `api.cloudinary.com` (no a `/api/photos`); `/api/photos` solo recibe un JSON pequeño. Una foto de más de 4,5 MB (y menos de `UPLOAD_MAX_MB`) se publica sin error.
- [ ] Una foto mayor que `UPLOAD_MAX_MB` se rechaza en el formulario antes de subirla.
- [ ] Las etiquetas se añaden con Enter o coma; los hashtags se muestran con `#` y se guardan sin él.
- [ ] Editar: el modal se abre con todos los campos rellenos; cambiar título, etiquetas, ubicación y fecha → se refleja en el grid; tras recargar persiste.
- [ ] Eliminar: el diálogo pide confirmación; tras confirmar desaparece del grid **y** de la Media Library de Cloudinary.
- [ ] `Esc` y clic en el fondo cierran los modales; el scroll del fondo queda bloqueado mientras están abiertos.
- [ ] Errores del servidor (p. ej. subir un `.gif`) se muestran dentro del formulario.
- [ ] Todo funciona en tema claro y oscuro y en móvil (DevTools → 375 px).

---

## Tanda 5 — Galería Pública, Modal de Detalle, Likes por IP y Descarga HD

### 1. Objetivo de la Tanda
Portada `/` con galería minimalista tipo *masonry* (miniaturas `f_auto,q_auto` responsive), "Cargar más", lightbox con imagen grande y toda la información (título, descripción, etiquetas, hashtags, ubicación en Google Maps, ❤ con contador optimista, botón de descarga HD), navegación con teclado y URL compartible `/?foto=<id>`.

### 2. Variables de Entorno Requeridas (Acción del Usuario)
| Variable | De dónde sale |
|---|---|
| `LIKES_IP_SALT` | Ejecuta `openssl rand -hex 32`. **No cambiarla después** (invalidaría los likes previos). |
| `TRUST_PROXY` | `false` en local. **`true` en Vercel**: su edge sobrescribe `X-Forwarded-For` con la IP real del visitante, así que no se puede falsificar. |

### 3. Dependencias a Instalar
Ninguna nueva.

### 4. Archivos a Crear o Modificar
```
src/lib/likes.ts                       (crear)
src/pages/api/photos/[id]/like.ts      (crear)
src/pages/api/photos/index.ts          (modificar: likedByMe en GET)
scripts/init-db.ts                     (modificar: índices de likes)
src/hooks/useLikedPhotos.ts            (crear)
src/components/gallery/LikeButton.tsx  (crear)
src/components/gallery/LocationLink.tsx(crear)
src/components/gallery/PhotoCard.tsx   (crear)
src/components/gallery/Lightbox.tsx    (crear)
src/components/gallery/Gallery.tsx     (crear)
src/pages/index.astro                  (modificar)
```

### 5. Especificación Técnica y Código de Referencia

**`src/lib/likes.ts`**
```ts
import { createHmac } from 'node:crypto';
import { MongoServerError, type ObjectId } from 'mongodb';
import type { APIContext } from 'astro';
import { db } from './db';
import { env } from './env';
import { photosCol } from './photos/repository';

interface LikeDoc { photoId: ObjectId; ipHash: string; createdAt: Date }
const likesCol = () => db.collection<LikeDoc>('likes');

const SALT = env('LIKES_IP_SALT');
const TRUST_PROXY = env('TRUST_PROXY', 'false') === 'true';

/** IP del cliente. Solo se confía en X-Forwarded-For si TRUST_PROXY=true. */
export function getClientIp(ctx: Pick<APIContext, 'request' | 'clientAddress'>): string | null {
  let ip: string | null = null;
  if (TRUST_PROXY) {
    ip = ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || ctx.request.headers.get('x-real-ip')?.trim()
      || null;
  }
  if (!ip) {
    try { ip = ctx.clientAddress; } catch { ip = null; }   // algunos entornos lanzan si no hay IP
  }
  return ip ? ip.replace(/^::ffff:/, '') : null;           // IPv4 mapeada en IPv6
}

/** HMAC-SHA256(salt, ip) en hex: no reversible sin la sal, la IP nunca se guarda. */
export const hashIp = (ip: string) => createHmac('sha256', SALT).update(ip).digest('hex');

/** Alterna el like. Devuelve el estado final y el contador actualizado. */
export async function toggleLike(photoId: ObjectId, ipHash: string) {
  try {
    await likesCol().insertOne({ photoId, ipHash, createdAt: new Date() });
    const doc = await photosCol().findOneAndUpdate(
      { _id: photoId }, { $inc: { likesCount: 1 } }, { returnDocument: 'after', projection: { likesCount: 1 } },
    );
    return { liked: true, likesCount: doc?.likesCount ?? 0 };
  } catch (err) {
    // 11000 = clave duplicada → ya había like de este hash → se quita.
    if (!(err instanceof MongoServerError && err.code === 11000)) throw err;
    const { deletedCount } = await likesCol().deleteOne({ photoId, ipHash });
    const doc = deletedCount
      ? await photosCol().findOneAndUpdate(
          { _id: photoId, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } },
          { returnDocument: 'after', projection: { likesCount: 1 } },
        )
      : await photosCol().findOne({ _id: photoId }, { projection: { likesCount: 1 } });
    return { liked: false, likesCount: doc?.likesCount ?? 0 };
  }
}

/** Qué fotos de la lista ya tienen like de este visitante (para pintar el estado inicial). */
export async function likedSet(ipHash: string, photoIds: ObjectId[]): Promise<Set<string>> {
  if (!photoIds.length) return new Set();
  const rows = await likesCol()
    .find({ ipHash, photoId: { $in: photoIds } }, { projection: { photoId: 1 } })
    .toArray();
  return new Set(rows.map((r) => r.photoId.toHexString()));
}
```

**`src/pages/api/photos/[id]/like.ts`**
```ts
import type { APIRoute } from 'astro';
import { json, jsonError } from '@/lib/http';
import { getClientIp, hashIp, toggleLike } from '@/lib/likes';
import { getPhoto, parseObjectId } from '@/lib/photos/repository';

export const POST: APIRoute = async (ctx) => {
  const id = parseObjectId(ctx.params.id);
  if (!id) return jsonError(400, 'ID inválido');

  const ip = getClientIp(ctx);
  if (!ip) return jsonError(400, 'No se pudo identificar el dispositivo');

  if (!(await getPhoto(id))) return jsonError(404, 'No encontrada');

  const result = await toggleLike(id, hashIp(ip));
  return json(result);
};
```

**`src/pages/api/photos/index.ts`** — sustituir el `GET` por:
```ts
import { getClientIp, hashIp, likedSet } from '@/lib/likes';
// ...
export const GET: APIRoute = async (ctx) => {
  const limit = Number(ctx.url.searchParams.get('limit') ?? 24) || 24;
  const cursor = ctx.url.searchParams.get('cursor');
  const { photos, nextCursor } = await listPhotos({ limit, cursor });
  const ip = getClientIp(ctx);
  const liked = ip ? await likedSet(hashIp(ip), photos.map((p) => p._id)) : new Set<string>();
  return json({ photos: photos.map((p) => toDTO(p, liked.has(p._id.toHexString()))), nextCursor });
};
```

**`scripts/init-db.ts`** — añadir antes del `console.log`:
```ts
  const likes = db.collection('likes');
  await likes.createIndexes([
    { key: { photoId: 1, ipHash: 1 }, name: 'photo_ip_unique', unique: true },
    { key: { ipHash: 1 }, name: 'ipHash' },
  ]);
```
> ⚠ El índice único es **imprescindible**: sin él, `toggleLike` nunca recibe el error 11000 y los likes se duplicarían. Ejecutar `npm run db:init` antes de probar.

**`src/hooks/useLikedPhotos.ts`** — `localStorage` como caché del estado para pintar el corazón al instante.
```ts
import { useCallback, useEffect, useState } from 'react';

const KEY = 'aqui-estuve:likes';

function read(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}
function write(set: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
}

export function useLikedPhotos() {
  const [liked, setLiked] = useState<Set<string>>(() => new Set());

  useEffect(() => { setLiked(read()); }, []);   // tras hidratar (evita mismatch SSR)

  const setLike = useCallback((id: string, value: boolean) => {
    setLiked((prev) => {
      const next = new Set(prev);
      value ? next.add(id) : next.delete(id);
      write(next);
      return next;
    });
  }, []);

  return { liked, setLike };
}
```
Regla de reconciliación: el servidor es la fuente de verdad. Al recibir `likedByMe` en la carga inicial o en `Cargar más`, y al recibir la respuesta del `POST /like`, se llama a `setLike(id, valorDelServidor)`.

**`src/components/gallery/LikeButton.tsx`** — UI optimista con rollback.
```tsx
import { useState } from 'react';
import { toggleLike } from '@/lib/api-client';

interface Props {
  photoId: string;
  count: number;
  liked: boolean;
  onChange: (state: { liked: boolean; likesCount: number }) => void;
}

export default function LikeButton({ photoId, count, liked, onChange }: Props) {
  const [pending, setPending] = useState(false);

  async function click() {
    if (pending) return;
    const prev = { liked, likesCount: count };
    onChange({ liked: !liked, likesCount: Math.max(0, count + (liked ? -1 : 1)) }); // optimista
    setPending(true);
    try {
      onChange(await toggleLike(photoId));                                         // verdad del servidor
    } catch {
      onChange(prev);                                                               // rollback
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={click} aria-pressed={liked}
      aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
      className="flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 transition hover:scale-105 dark:border-stone-700">
      <span aria-hidden className={`text-xl ${liked ? 'text-red-500' : 'text-stone-400'}`}>{liked ? '♥' : '♡'}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
```

**`src/components/gallery/LocationLink.tsx`**
```tsx
import { mapsHref, type PhotoLocation } from '@/lib/photos/types';

export default function LocationLink({ location }: { location: PhotoLocation }) {
  return (
    <a href={mapsHref(location)} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-stone-600 underline-offset-4 hover:underline dark:text-stone-300">
      <span aria-hidden>📍</span>{location.name}
    </a>
  );
}
```

**`src/components/gallery/PhotoCard.tsx`**
```tsx
import type { PhotoDTO } from '@/lib/photos/types';
import { thumbSrcSet, thumbUrl } from '@/lib/cloudinary-url';

export default function PhotoCard({ photo, onOpen, eager }: { photo: PhotoDTO; onOpen: () => void; eager?: boolean }) {
  return (
    <button type="button" onClick={onOpen}
      className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2">
      <img
        src={thumbUrl(photo.imageUrl, 800)}
        srcSet={thumbSrcSet(photo.imageUrl)}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        width={photo.width}
        height={photo.height}            // reserva espacio → sin CLS
        alt={photo.title}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-auto w-full bg-stone-200 transition duration-500 group-hover:scale-[1.02] dark:bg-stone-800"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-left text-sm text-white opacity-0 transition group-hover:opacity-100">
        {photo.title}
      </span>
    </button>
  );
}
```

**`src/components/gallery/Lightbox.tsx`**
```tsx
import { useEffect } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { downloadUrl, lightboxUrl } from '@/lib/cloudinary-url';
import Modal from '@/components/ui/Modal';
import LikeButton from './LikeButton';
import LocationLink from './LocationLink';

interface Props {
  photo: PhotoDTO | null;
  liked: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onLikeChange: (id: string, s: { liked: boolean; likesCount: number }) => void;
}

export default function Lightbox({ photo, liked, onClose, onPrev, onNext, onLikeChange }: Props) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onPrev, onNext]);

  return (
    <Modal open={photo !== null} onClose={onClose} labelledBy="lightbox-title" className="max-h-dvh max-w-[100vw]">
      {photo && (
        <div className="grid max-h-[95dvh] w-[min(1400px,96vw)] overflow-hidden rounded-2xl bg-white text-stone-900 lg:grid-cols-[1fr_380px] dark:bg-stone-900 dark:text-stone-100">
          <div className="relative flex items-center justify-center bg-black">
            <img key={photo.id} src={lightboxUrl(photo.imageUrl)} alt={photo.title}
              width={photo.width} height={photo.height}
              className="max-h-[60dvh] w-auto object-contain lg:max-h-[95dvh]" />
            {onPrev && <button type="button" onClick={onPrev} aria-label="Anterior" className="absolute left-2 rounded-full bg-black/50 px-3 py-2 text-white">‹</button>}
            {onNext && <button type="button" onClick={onNext} aria-label="Siguiente" className="absolute right-2 rounded-full bg-black/50 px-3 py-2 text-white">›</button>}
          </div>

          <aside className="flex flex-col gap-4 overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id="lightbox-title" className="font-serif text-2xl leading-tight">{photo.title}</h2>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="text-2xl leading-none">×</button>
            </div>
            <time dateTime={photo.createdAt} className="text-sm text-stone-500">
              {new Date(photo.createdAt).toLocaleDateString('es', { dateStyle: 'long' })}
            </time>
            {photo.location && <LocationLink location={photo.location} />}
            {photo.description && <p className="whitespace-pre-line leading-relaxed text-stone-700 dark:text-stone-300">{photo.description}</p>}
            {photo.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {photo.tags.map((t) => <li key={t} className="rounded-full bg-stone-200 px-3 py-1 text-xs dark:bg-stone-800">{t}</li>)}
              </ul>
            )}
            {photo.hashtags.length > 0 && (
              <p className="text-sm text-sky-700 dark:text-sky-400">{photo.hashtags.map((h) => `#${h}`).join(' ')}</p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
              <LikeButton photoId={photo.id} count={photo.likesCount} liked={liked}
                onChange={(s) => onLikeChange(photo.id, s)} />
              {/* fl_attachment ⇒ Cloudinary responde con Content-Disposition: attachment (funciona cross-origin) */}
              <a href={downloadUrl(photo.imageUrl, photo.title)} rel="noopener"
                className="rounded-full bg-stone-900 px-4 py-2 text-white dark:bg-stone-100 dark:text-stone-900">
                ↓ Descargar HD
              </a>
              <span className="text-xs text-stone-500">{photo.width}×{photo.height} · {photo.format.toUpperCase()}</span>
            </div>
          </aside>
        </div>
      )}
    </Modal>
  );
}
```

**`src/components/gallery/Gallery.tsx`**
```tsx
import { useCallback, useEffect, useState } from 'react';
import type { PhotoDTO } from '@/lib/photos/types';
import { fetchPhotos } from '@/lib/api-client';
import { useLikedPhotos } from '@/hooks/useLikedPhotos';
import PhotoCard from './PhotoCard';
import Lightbox from './Lightbox';

interface Props {
  initialPhotos: PhotoDTO[];
  initialCursor: string | null;
  initialOpenId?: string | null;
}

export default function Gallery({ initialPhotos, initialCursor, initialOpenId = null }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const { liked, setLike } = useLikedPhotos();

  // Reconciliar localStorage con lo que dice el servidor.
  const syncFromServer = useCallback((list: PhotoDTO[]) => {
    list.forEach((p) => p.likedByMe !== undefined && setLike(p.id, p.likedByMe));
  }, [setLike]);
  useEffect(() => { syncFromServer(initialPhotos); }, [initialPhotos, syncFromServer]);

  // URL compartible: /?foto=<id>
  useEffect(() => {
    const url = new URL(window.location.href);
    openId ? url.searchParams.set('foto', openId) : url.searchParams.delete('foto');
    window.history.replaceState(null, '', url);
  }, [openId]);

  const index = photos.findIndex((p) => p.id === openId);
  const current = index >= 0 ? photos[index] : null;

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const { photos: more, nextCursor } = await fetchPhotos(cursor);
      setPhotos((prev) => [...prev, ...more]);
      setCursor(nextCursor);
      syncFromServer(more);
    } finally {
      setLoading(false);
    }
  }

  function onLikeChange(id: string, s: { liked: boolean; likesCount: number }) {
    setLike(id, s.liked);
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, likesCount: s.likesCount } : p)));
  }

  if (photos.length === 0) {
    return <p className="py-32 text-center text-stone-500">Todavía no hay fotografías publicadas.</p>;
  }

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {photos.map((p, i) => (
          <PhotoCard key={p.id} photo={p} eager={i < 6} onOpen={() => setOpenId(p.id)} />
        ))}
      </div>

      {cursor && (
        <div className="mt-10 text-center">
          <button type="button" onClick={loadMore} disabled={loading}
            className="rounded-full border border-stone-300 px-6 py-2 disabled:opacity-50 dark:border-stone-700">
            {loading ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}

      <Lightbox
        photo={current}
        liked={current ? liked.has(current.id) : false}
        onClose={() => setOpenId(null)}
        onPrev={index > 0 ? () => setOpenId(photos[index - 1].id) : undefined}
        onNext={index >= 0 && index < photos.length - 1 ? () => setOpenId(photos[index + 1].id) : undefined}
        onLikeChange={onLikeChange}
      />
    </>
  );
}
```

**`src/pages/index.astro`**
```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import Gallery from '@/components/gallery/Gallery';
import { getPhoto, listPhotos, parseObjectId } from '@/lib/photos/repository';
import { toDTO } from '@/lib/photos/types';
import { getClientIp, hashIp, likedSet } from '@/lib/likes';
import { ogImageUrl } from '@/lib/cloudinary-url';

const { photos, nextCursor } = await listPhotos({ limit: 30 });

// Enlace compartido /?foto=<id>: si no está en la primera página, se antepone.
const sharedId = parseObjectId(Astro.url.searchParams.get('foto') ?? undefined);
let shared = sharedId ? photos.find((p) => p._id.equals(sharedId)) ?? null : null;
if (sharedId && !shared) {
  shared = await getPhoto(sharedId);
  if (shared) photos.unshift(shared);
}

const ip = getClientIp(Astro);
const liked = ip ? await likedSet(hashIp(ip), photos.map((p) => p._id)) : new Set<string>();
const dtos = photos.map((p) => toDTO(p, liked.has(p._id.toHexString())));
---
<BaseLayout
  title={shared ? `${shared.title} · Aquí Estuve` : 'Aquí Estuve'}
  description={shared?.description?.slice(0, 160) || undefined}
  image={shared ? ogImageUrl(shared.imageUrl) : photos[0] ? ogImageUrl(photos[0].imageUrl) : undefined}
>
  <Gallery client:load initialPhotos={dtos} initialCursor={nextCursor} initialOpenId={shared?._id.toHexString() ?? null} />
</BaseLayout>
```

### 6. Criterio de Verificación (Checklist)
- [ ] `npm run db:init` crea `photo_ip_unique` en la colección `likes`.
- [ ] `/` muestra la galería en 1/2/3 columnas según el ancho; en *Network* las miniaturas llevan `c_limit,w_…,f_auto,q_auto` y se sirven como AVIF/WebP; no hay saltos de layout al cargar (Lighthouse CLS ≈ 0).
- [ ] Clic en una foto → lightbox con imagen grande, título, fecha, descripción, etiquetas, hashtags, ubicación (abre Google Maps en pestaña nueva), ❤ y "Descargar HD".
- [ ] ← / → navegan entre fotos; `Esc`, ✕ o clic en el fondo cierran; la URL cambia a `/?foto=<id>` y abrir esa URL en otra pestaña abre directamente el lightbox.
- [ ] ❤: el contador sube al instante; recargar la página mantiene el corazón activo y el número.
- [ ] Segundo clic quita el like (toggle) y el contador baja; nunca es negativo.
- [ ] Desde **otro navegador del mismo equipo** (misma IP) el corazón aparece activo (lo indica el servidor vía `likedByMe`) y un clic lo quita: 1 like por IP.
- [ ] Desde el móvil con datos (otra IP) se puede dar un like adicional.
- [ ] En Mongo, `likes` guarda `ipHash` (64 hex), **nunca** la IP en claro.
- [ ] Concurrencia: `for i in 1 2 3 4 5; do curl -s -X POST -H 'Origin: http://localhost:4321' http://localhost:4321/api/photos/<ID>/like & done; wait` → `likesCount` final es 0 o 1, jamás > 1.
- [ ] "Descargar HD" descarga un archivo llamado `<slug-del-titulo>.<ext>` con las dimensiones originales (`width×height` mostrados).
- [ ] Todo correcto en tema claro/oscuro y en 375 px.

---

## Tanda 6 — Pulido, SEO, Seguridad y Despliegue en Vercel

### 1. Objetivo de la Tanda
Proyecto en producción en Vercel desde la rama `main`: página 404, cabeceras de seguridad, metadatos Open Graph, build verificada y despliegue automático en cada push.

### 2. Variables de Entorno Requeridas (Acción del Usuario)
En Vercel → *Project* → **Settings → Environment Variables**, definir para el entorno *Production* **todas** las variables de `.env.example` con valores de producción:
- `SITE_URL` y `BETTER_AUTH_URL` = `https://tu-dominio.com` o `https://<proyecto>.vercel.app` (idénticas, sin barra final). Si cambias de dominio, actualiza ambas y vuelve a desplegar.
- `TRUST_PROXY=true`.
- `MONGODB_URI`: Vercel no tiene IPs de salida fijas en el plan gratuito → en Atlas → *Network Access* añadir `0.0.0.0/0` (la protección es la contraseña del usuario de BD; usa una larga y un usuario con permisos solo sobre `aqui_estuve`).
- **No** subir `ADMIN_PASSWORD` a Vercel: el seed se ejecuta una vez desde local apuntando a la BD de producción.
- Las *Preview Deployments* (otras ramas/PRs) tendrán otra URL: si alguna vez se usan, `BETTER_AUTH_URL` del entorno *Preview* debe coincidir con esa URL o el login fallará. Como todo va a `main`, basta con *Production*.

### 3. Dependencias a Instalar
```bash
npm install -g vercel   # opcional: CLI para enlazar el proyecto y ver logs (vercel logs)
```

### 4. Archivos a Crear o Modificar
```
src/pages/404.astro       (crear)
src/middleware.ts         (modificar: cabeceras de seguridad)
public/robots.txt         (crear)
public/favicon.svg        (reemplazar)
```

### 5. Especificación Técnica y Código de Referencia

**`src/pages/404.astro`**
```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="No encontrado · Aquí Estuve">
  <div class="py-32 text-center">
    <h1 class="font-serif text-5xl">Aquí no estuve</h1>
    <p class="mt-4 text-stone-500"><a href="/" class="underline">Volver a la galería</a></p>
  </div>
</BaseLayout>
```

**`src/middleware.ts`** — al final de `onRequest`, antes de `return response`:
```ts
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
```
> Algunas respuestas (redirecciones) tienen cabeceras inmutables: envolver los `set` en `try { … } catch {}`.

**`public/robots.txt`**
```
User-agent: *
Disallow: /admin
Disallow: /api
```

**Build local de verificación**
```bash
npm run build      # astro check + astro build → .vercel/output/
```

**Despliegue en Vercel (desde `main`)**
1. Subir el repo a GitHub: `git remote add origin git@github.com:<usuario>/aqui-estuve.git && git push -u origin main`.
2. Vercel → *Add New → Project* → importar el repo. *Framework Preset*: **Astro** (lo detecta). Build Command y Output Directory: dejar los valores por defecto (el adaptador escribe `.vercel/output`).
3. Configurar las variables de entorno (sección 2) **antes** del primer deploy.
4. *Settings → Git → Production Branch* = `main`. Cada push a `main` despliega a producción.
5. Primer arranque de la BD de producción, desde local con un `.env` que apunte a ella: `npm run db:init` y `npm run seed:admin`.

> El adaptador elige el runtime **Node 24** (el aviso `The local Node.js version (26) is not supported` en la build local es esperado y no afecta).
> El SDK de Cloudinary y el driver de MongoDB requieren runtime Node: **no** activar `edgeMiddleware` en el adaptador.

### 6. Criterio de Verificación (Checklist)
- [ ] `npm run build` termina sin errores de tipos ni de build.
- [ ] El deploy de Vercel termina en *Ready*; `https://<dominio>/api/health` → `{"ok":true,"db":"up"}`.
- [ ] Repetir en producción los checklists esenciales de las Tandas 2, 4 y 5 (login, crear/editar/eliminar con una foto > 4,5 MB, like, descarga).
- [ ] Un like desde el móvil (datos) y otro desde el ordenador (wifi) cuentan como 2; repetir desde el mismo dispositivo lo quita.
- [ ] Una ruta inexistente muestra la página 404 personalizada.
- [ ] `curl -I https://<dominio>/` muestra `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.
- [ ] En producción: la cookie de sesión lleva el atributo **Secure** y el prefijo `__Secure-`.
- [ ] Compartir `https://tu-dominio.com/?foto=<id>` en un validador de Open Graph muestra la imagen 1200×630.
- [ ] Lighthouse (móvil) en `/`: Performance ≥ 90, Accessibility ≥ 95.

---

## Anexo A — Riesgos conocidos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Versiones de `better-auth` y `@better-auth/mongo-adapter` desalineadas | Instalar ambas con la misma versión exacta (`@1.7.12`). |
| `mongod` local sin replica set → errores de transacción en Better Auth | `MONGODB_TRANSACTIONS=false`. |
| Contador `likesCount` desincronizado tras un fallo entre `insertOne` y `$inc` | Probabilidad baja; si ocurre, recalcular: `db.likes.aggregate([{ $group: { _id: '$photoId', n: { $sum: 1 } } }])` y fijar cada `likesCount`. |
| Varios visitantes detrás de la misma IP (NAT, oficina) comparten like | Limitación aceptada del requisito "1 like por IP". |
| Spoofing de `X-Forwarded-For` | Solo se lee si `TRUST_PROXY=true` (es decir, cuando un proxy de confianza la sobrescribe). |
| Imágenes huérfanas en Cloudinary si falla Mongo al crear | Compensación con `destroyImage` en el `catch` de `POST /api/photos`. Si se abandona el formulario tras subir, limpieza manual en la Media Library. |
| Límite de 4,5 MB de body en funciones de Vercel | Subida firmada directa navegador → Cloudinary; el servidor solo recibe JSON. |
| Arranque en frío de funciones Vercel (primera petición más lenta) | Singleton de `MongoClient` en `globalThis`; aceptable para un fotoblog personal. |
| Límite de la Admin API de Cloudinary (500 llamadas/hora en plan gratuito) | Solo se usa `api.resource` al publicar una foto: muy por debajo del límite. |
| "Strict transformations" activado en Cloudinary | Verificado en Tanda 3; si se activa, las URLs transformadas fallan. |

## Anexo B — Mejoras futuras (fuera de alcance)
- Leer la fecha EXIF (`DateTimeOriginal`) subiendo con `media_metadata: true` y usarla como `createdAt` por defecto.
- Página permanente `/foto/[slug]` para SEO por fotografía.
- Filtro de la galería por etiqueta/hashtag (los índices ya existen).
- Rate limiting de `/api/photos/:id/like` por `ipHash`.
- Reordenar fotos manualmente en el CMS (campo `order`).
