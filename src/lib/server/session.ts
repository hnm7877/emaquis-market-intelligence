/** Côté serveur uniquement : adresse de l'API (jamais envoyée au navigateur). */
export function apiBaseUrl(): string {
  const isProd = process.env.NODE_ENV === 'production';
  return (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (isProd ? 'https://api.emaquis-api.fyi/api/v1' : 'http://localhost:3001/api/v1')
  ).replace(/\/$/, '');
}

/** Cookie de session : httpOnly (illisible par les scripts), même nom que celui lu par l'API. */
export const SESSION_COOKIE = 'mi_session';

/** Expiration (secondes epoch) lue dans le JWT, sans vérification (l'API vérifie la signature). */
export function tokenExp(token: string | undefined | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.max(0, Math.floor(maxAge)),
  };
}
