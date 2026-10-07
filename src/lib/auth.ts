/**
 * Session Market Intelligence côté navigateur.
 * Le token (JWT admin E-Maquis) est obtenu via la connexion OTP et envoyé à chaque requête.
 */
const TOKEN_KEY = 'mi_access_token';
// Anciennes clés lues en repli (compatibilité)
const LEGACY_KEYS = ['access_token', 'token'];

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ||
      null
    );
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* stockage indisponible : la session ne survivra pas au rechargement */
  }
}

export function clearAuthToken() {
  try {
    [TOKEN_KEY, ...LEGACY_KEYS].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

/** Expiration lue dans le JWT (sans vérification : la vérification est faite par l'API) */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const LOGIN_PATH = '/login';

/** Redirige vers la page de connexion (session absente, expirée ou refusée) */
export function redirectToLogin(reason?: string) {
  if (typeof window === 'undefined') return;
  clearAuthToken();
  if (window.location.pathname === LOGIN_PATH) return;
  const url = reason ? `${LOGIN_PATH}?reason=${encodeURIComponent(reason)}` : LOGIN_PATH;
  window.location.assign(url);
}
