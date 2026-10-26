import { cookies } from 'next/headers';
import { apiBaseUrl, cookieOptions, SESSION_COOKIE, tokenExp } from '@/lib/server/session';

/**
 * Session Market Intelligence par cookie httpOnly :
 * - POST : vérifie le code OTP auprès de l'API, contrôle l'accès Market Intelligence, pose le cookie ;
 * - GET : état de la session (jamais le jeton) ;
 * - DELETE : déconnexion.
 * Le jeton n'est jamais renvoyé au navigateur : une faille XSS ne peut plus le voler.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: 'Requête invalide.' }, { status: 400 });
  }
  const { email, otp } = (body ?? {}) as { email?: unknown; otp?: unknown };
  if (typeof email !== 'string' || typeof otp !== 'string' || email.length > 200 || otp.length > 20) {
    return Response.json({ message: 'E-mail ou code invalide.' }, { status: 400 });
  }

  const api = apiBaseUrl();
  const verify = await fetch(`${api}/user/admin/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    cache: 'no-store',
  }).catch(() => null);
  if (!verify) return Response.json({ message: 'Serveur injoignable, réessayez.' }, { status: 502 });
  const data = await verify.json().catch(() => ({}));
  if (!verify.ok || typeof data?.access_token !== 'string') {
    return Response.json({ message: data?.message || 'Code invalide ou expiré.' }, { status: verify.ok ? 401 : verify.status });
  }
  const token: string = data.access_token;

  // Le compte doit ouvrir l'accès Market Intelligence (sinon pas de session)
  const me = await fetch(`${api}/market-intelligence/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!me?.ok) {
    return Response.json({ message: 'Ce compte n’a pas accès à Market Intelligence.' }, { status: 403 });
  }
  const session = await me.json().catch(() => ({}));

  const exp = tokenExp(token);
  const maxAge = exp ? exp - Date.now() / 1000 : 8 * 3600;
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(maxAge));
  return Response.json({ authenticated: true, exp, session });
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const exp = tokenExp(token);
  const authenticated = !!token && (!exp || exp * 1000 > Date.now());
  return Response.json({ authenticated, exp: authenticated ? exp : null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
