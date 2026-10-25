'use client';

import React from 'react';

export interface ShelfPrice {
  count: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
}

const f = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

/**
 * Échelle de prix : fourchette des prix affichés par les établissements (min → max, zone
 * centrale = moitié des établissements), prix moyen réellement encaissé et coût d'achat.
 */
export function PriceLadder({ shelf, avgSale, unitCost, compact = false }: { shelf: ShelfPrice | null; avgSale: number | null; unitCost: number | null; compact?: boolean }) {
  const values = [shelf?.min, shelf?.max, avgSale, unitCost].filter((v): v is number => v != null && v > 0);
  if (!values.length) return <span className="text-[11px] text-muted-foreground">Pas de prix connu</span>;
  const lo = Math.min(...values) * 0.95;
  const hi = Math.max(...values) * 1.05;
  const pos = (v: number) => `${((v - lo) / (hi - lo || 1)) * 100}%`;

  return (
    <div className={compact ? 'w-full' : 'w-full pt-5 pb-6'}>
      <div className="relative h-2 rounded-full bg-muted">
        {shelf && (
          <>
            <div className="absolute inset-y-0 rounded-full bg-amber-500/25" style={{ left: pos(shelf.min), width: `calc(${pos(shelf.max)} - ${pos(shelf.min)})` }} />
            <div className="absolute inset-y-0 rounded-full bg-amber-500/70" style={{ left: pos(shelf.p25), width: `calc(${pos(shelf.p75)} - ${pos(shelf.p25)})` }} />
            <div className="absolute -top-1 h-4 w-0.5 bg-amber-300" style={{ left: pos(shelf.median) }} title={`Prix médian affiché : ${f(shelf.median)}`} />
          </>
        )}
        {avgSale != null && (
          <div className="absolute -top-1.5 size-5 -translate-x-1/2 rounded-full border-2 border-background bg-emerald-400 shadow" style={{ left: pos(avgSale) }} title={`Prix moyen encaissé : ${f(avgSale)}`} />
        )}
        {unitCost != null && (
          <div className="absolute -top-1.5 size-5 -translate-x-1/2 rotate-45 rounded-sm border-2 border-background bg-cyan-400 shadow" style={{ left: pos(unitCost) }} title={`Coût d'achat moyen : ${f(unitCost)}`} />
        )}
      </div>
      {!compact && (
        <div className="relative mt-2 h-8 text-[10px] text-muted-foreground">
          {shelf && (
            <>
              <span className="absolute -translate-x-1/2" style={{ left: pos(shelf.min) }}>
                {f(shelf.min)}
              </span>
              <span className="absolute -translate-x-1/2" style={{ left: pos(shelf.max) }}>
                {f(shelf.max)}
              </span>
            </>
          )}
          {avgSale != null && (
            <span className="absolute top-4 -translate-x-1/2 font-semibold text-emerald-400" style={{ left: pos(avgSale) }}>
              {f(avgSale)}
            </span>
          )}
          {unitCost != null && (
            <span className="absolute top-4 -translate-x-1/2 font-semibold text-cyan-400" style={{ left: pos(unitCost) }}>
              {f(unitCost)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
