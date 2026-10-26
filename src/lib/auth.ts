/**
 * Session Market Intelligence côté navigateur.
 * Le jeton vit dans un cookie httpOnly posé par le serveur du site (/api/session) : aucun script,
 * y compris une éventuelle injection, ne peut le lire. Le navigateur ne connaît que l'état
 * « connecté / expiré ».
 */

// Anciennes clés du jeton en localStorage : effacées (versions précédentes du site)
const LEGACY_KEYS = ['mi_access_token', 'access_token', 'token'];

export function purgeLegacyTokens() {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* stockage indisponible : rien à effacer */
  }
}

export type SessionState = { authenticated: boolean; exp: number | null };

/** État de la session (le jeton lui-même n'est jamais renvoyé). */
export async function fetchSessionState(): Promise<SessionState> {
  try {
    const r = await fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) return { authenticated: false, exp: null };
    return (await r.json()) as SessionState;
  } catch {
    return { authenticated: false, exp: null };
  }
}

/** Connexion : le serveur du site vérifie le code et pose le cookie de session. */
export async function loginWithOtp(email: string, otp: string): Promise<void> {
  const r = await fetch('/api/session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(typeof data?.message === 'string' ? data.message : 'Code invalide ou expiré.');
  }
  purgeLegacyTokens();
}

/** Déconnexion : le cookie est supprimé par le serveur du site. */
export async function logoutSession(): Promise<void> {
  purgeLegacyTokens();
  try {
    await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
  } catch {
    /* hors ligne : le cookie expirera de lui-même */
  }
}

export const LOGIN_PATH = '/login';

/** Redirige vers la page de connexion (session absente, expirée ou refusée) */
export function redirectToLogin(reason?: string) {
  if (typeof window === 'undefined') return;
  void logoutSession().finally(() => {
    if (window.location.pathname === LOGIN_PATH) return;
    const url = reason ? `${LOGIN_PATH}?reason=${encodeURIComponent(reason)}` : LOGIN_PATH;
    window.location.assign(url);
  });
}
