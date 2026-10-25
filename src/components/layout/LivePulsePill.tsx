'use client';

import React, { useEffect, useState } from 'react';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

/**
 * Indicateur du direct : état de la connexion et ventes du réseau reçues depuis l'ouverture
 * (résumé market:pulse toutes les 3 s). Clignote brièvement à chaque nouveau résumé.
 */
export function LivePulsePill() {
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const totals = useMarketRealtimeStore((s) => s.liveTotals);
  const lastAt = useMarketRealtimeStore((s) => s.lastPulse?.at);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!lastAt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- signal visuel bref à chaque résumé reçu
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [lastAt]);

  return (
    <div
      className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        isConnected
          ? flash
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
          : 'bg-muted border-border text-muted-foreground'
      }`}
      title={totals.since ? `Ventes reçues en direct depuis ${new Date(totals.since).toLocaleTimeString('fr-FR')}` : 'Flux des ventes en direct'}
    >
      <span className={`size-2 rounded-full ${isConnected ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
      {isConnected ? (
        <span>
          En direct · <strong>{totals.sales.toLocaleString('fr-FR')}</strong> vente{totals.sales > 1 ? 's' : ''}
          {totals.amount > 0 && <> · {fcfa(totals.amount)}</>}
        </span>
      ) : (
        <span>Direct en reconnexion…</span>
      )}
    </div>
  );
}
