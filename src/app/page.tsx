import type { Metadata } from 'next';
import { PublicLanding } from '@/components/public/PublicLanding';
import { apiBaseUrl } from '@/lib/server/session';
import { parsePublicBoard, type PublicBoard } from '@/lib/validations/public-board.schema';

export const metadata: Metadata = {
  title: 'E-Maquis Market Intelligence | La bourse des boissons en temps réel',
  description:
    'Classement en direct des boissons les plus vendues dans les maquis, bars et restaurants du réseau E-Maquis : qui monte, qui descend, qui passe devant.',
  openGraph: {
    title: 'La bourse des boissons, en temps réel',
    description: 'Regardez les produits se dépasser en direct dans le réseau E-Maquis.',
    type: 'website',
  },
};

// Rendu côté serveur (classement visible immédiatement, adresse de l'API jamais exposée)
export const revalidate = 15;

async function initialBoard(): Promise<PublicBoard | null> {
  try {
    const r = await fetch(`${apiBaseUrl()}/market-public/board?scope=all`, { next: { revalidate: 15 } });
    return r.ok ? parsePublicBoard(await r.json()) : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  return <PublicLanding initial={await initialBoard()} />;
}
