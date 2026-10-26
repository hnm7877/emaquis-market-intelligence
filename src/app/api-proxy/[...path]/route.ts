import { cookies } from 'next/headers';
import { apiBaseUrl, SESSION_COOKIE } from '@/lib/server/session';

/**
 * Relais vers l'API : le navigateur appelle /api-proxy/... sur le domaine du site ; le serveur
 * Next ajoute le jeton lu dans le cookie httpOnly. L'adresse de l'API et le jeton ne sont
 * jamais exposés au navigateur.
 */
async function relay(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  // Chemin strict : segments simples uniquement (pas de « .. », pas d'adresse absolue)
  if (!path?.length || path.some((p) => !p || p === '.' || p === '..' || p.includes('/') || p.includes('\\'))) {
    return Response.json({ message: 'Chemin invalide.' }, { status: 400 });
  }
  const url = new URL(request.url);
  const target = `${apiBaseUrl()}/${path.map(encodeURIComponent).join('/')}${url.search}`;

  const headers = new Headers();
  const type = request.headers.get('content-type');
  if (type) headers.set('content-type', type);
  headers.set('accept', request.headers.get('accept') || 'application/json');
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) headers.set('x-forwarded-for', fwd);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) headers.set('authorization', `Bearer ${token}`);

  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);
  const upstream = await fetch(target, {
    method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: 'no-store',
    redirect: 'manual',
  }).catch(() => null);
  if (!upstream) return Response.json({ message: 'Serveur injoignable.' }, { status: 502 });

  const out = new Headers();
  for (const h of ['content-type', 'content-disposition', 'cache-control']) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export const GET = relay;
export const POST = relay;
export const PUT = relay;
export const PATCH = relay;
export const DELETE = relay;
