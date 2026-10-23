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
