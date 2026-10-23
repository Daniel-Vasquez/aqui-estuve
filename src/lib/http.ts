export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function jsonError(status: number, error: string, details?: unknown): Response {
  return json(details === undefined ? { error } : { error, details }, status);
}
