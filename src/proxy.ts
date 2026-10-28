import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Pages protégées côté serveur : sans cookie de session, retour à la connexion avant même
 * l'affichage (la validité du jeton reste vérifiée par l'API à chaque appel).
 */
export function proxy(request: NextRequest) {
  // Accueil public (classement en direct) : visible sans connexion
  if (request.nextUrl.pathname === '/') return NextResponse.next();
  if (!request.cookies.has('mi_session')) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Toutes les pages, sauf la connexion, les routes du serveur, le temps réel et les fichiers
  matcher: ['/((?!login|api|api-proxy|rt|_next|favicon.ico|brands|.*\\..*).*)'],
};
