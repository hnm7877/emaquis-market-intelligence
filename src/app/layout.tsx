import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { ClientAppShell } from '@/components/layout/ClientAppShell';
import { QueryProvider } from '@/providers/QueryProvider';

const roboto = Roboto({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'E-Maquis Market Intelligence | Plateforme B2B de Business Intelligence',
  description:
    "Plateforme ivoirienne de Market Intelligence analysant les donnees reelles de consommation hors domicile (maquis, bars, restaurants) en Cote d'Ivoire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`dark ${roboto.variable}`} suppressHydrationWarning>
      <body
        className={`${roboto.className} min-h-screen bg-background text-foreground antialiased selection:bg-orange-500 selection:text-white`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <ClientAppShell>{children}</ClientAppShell>
        </QueryProvider>
      </body>
    </html>
  );
}