'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/layout/FilterBar';
import { Boxes, AlertTriangle, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { useProductsQuery, useStockIntelligenceQuery } from '@/hooks/market/useMarketQueries';
import { formatGrowth } from '@/utils/metrics';
import type { MarketAlert, ProductItem } from '@/lib/validations/market.schemas';

interface RotationRanking {
  category: string;
  rotationRate: number;
  activePos: number;
  volume: number;
}

const RISK_LABELS: Record<string, string> = {
  HIGH: 'Élevée',
  MEDIUM: 'Modérée',
  LOW: 'Faible',
};

export default function StockIntelligencePage() {
  const { data: stockData, isLoading } = useStockIntelligenceQuery();
  const { data: productsData, isLoading: productsLoading } = useProductsQuery();

  // Produits à forte vélocité (estimation dérivée des ventes réelles, pas de niveau de stock)
  const highVelocity = (productsData?.products ?? [])
    .filter((p: ProductItem) => p.volume > 0 && (p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'MEDIUM'))
    .slice(0, 12);

  const rotationRankings: RotationRanking[] = stockData?.rotationRankings ?? [];
  const demandSignals: MarketAlert[] = stockData?.demandSignals ?? [];
  const availabilityMessage: string | undefined = stockData?.dataAvailability?.message;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Boxes className="size-5 text-orange-500" />
              Stock Intelligence &amp; Vélocité
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading || productsLoading
                ? 'Analyse des ventes...'
                : `${highVelocity.length} références à forte vélocité`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rotation et signaux de demande calculés à partir des ventes observées dans le réseau E-Maquis.
          </p>
        </div>
      </div>

      <FilterBar />

      {availabilityMessage && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs">
          <Info className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground block text-sm">Niveaux de stock non disponibles</span>
            <p className="text-muted-foreground mt-1">{availabilityMessage}</p>
          </div>
        </div>
      )}

      {/* Signaux de demande réels */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="size-4 text-amber-500" />
          Signaux de demande ({stockData?.comparisonLabel ?? 'période courante vs précédente'})
        </div>
        {demandSignals.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? 'Calcul en cours…'
              : 'Aucune variation significative (±20 %, au moins 3 points de vente) détectée sur ce périmètre.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {demandSignals.map((s) => (
              <div key={s.id} className="p-3 rounded-lg border border-border/60 bg-background/50 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {s.variation >= 0 ? (
                      <TrendingUp className="size-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="size-3.5 text-rose-400" />
                    )}
                    {s.scope === 'zone' ? s.zone : s.category}
                  </span>
                  <span className={`font-mono font-bold ${s.variation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatGrowth(s.variation)}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {s.currentVolume?.toLocaleString('fr-FR')} u. contre {s.previousVolume?.toLocaleString('fr-FR')} u. —{' '}
                  {s.coveragePos} points de vente, confiance {s.confidence}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Rotation par catégorie */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
        <div className="text-sm font-semibold text-foreground">
          Rotation par catégorie (unités / point de vente / semaine)
        </div>
        {rotationRankings.length === 0 ? (
          <p className="text-xs text-muted-foreground">{isLoading ? 'Calcul en cours…' : 'Aucune vente sur ce périmètre.'}</p>
        ) : (
          <div className="divide-y divide-border/50 text-xs">
            {rotationRankings.map((r) => (
              <div key={r.category} className="py-2 flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{r.category}</span>
                <span className="text-muted-foreground">
                  <strong className="font-mono text-foreground">{r.rotationRate}</strong> u./POS/sem ·{' '}
                  {r.activePos} POS · {r.volume.toLocaleString('fr-FR')} u.
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Produits à forte vélocité */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">Références à forte vélocité (estimation)</div>
        {highVelocity.length === 0 && !productsLoading && (
          <p className="text-xs text-muted-foreground">Aucune référence à forte vélocité sur ce périmètre.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highVelocity.map((p: ProductItem) => (
            <Card key={p.id} className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground text-sm block">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {p.brand}
                    {p.format ? ` • ${p.format}` : ''}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    p.stockoutRisk === 'HIGH'
                      ? 'border-red-500 text-red-500 bg-red-500/10'
                      : 'border-amber-500 text-amber-500 bg-amber-500/10'
                  }
                >
                  Tension {RISK_LABELS[p.stockoutRisk] ?? p.stockoutRisk}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Rotation observée</span>
                  <span className="font-bold font-mono">{p.rotationRate} u./POS/sem</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Réassort estimé</span>
                  <span className="font-bold font-mono">Tous les {p.reorderFrequencyDays} jours</span>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground text-[10px] block">Communes principales :</span>
                <span className="font-medium text-foreground">
                  {p.topCommunes?.length ? p.topCommunes.join(', ') : 'Non localisé'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
