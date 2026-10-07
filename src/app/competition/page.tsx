'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Info } from 'lucide-react';
import { FilterBar } from '@/components/layout/FilterBar';
import { useProductsQuery } from '@/hooks/market/useMarketQueries';
import { computeShareLocal, formatGrowth, growthColorClass } from '@/utils/metrics';
import type { ProductItem } from '@/lib/validations/market.schemas';

const SLOT_STYLES = [
  'border-amber-500/30 bg-amber-500/5',
  'border-blue-500/30 bg-blue-500/5',
  'border-emerald-500/30 bg-emerald-500/5',
];

export default function CompetitionPage() {
  const { data, isLoading, isError } = useProductsQuery();

  // Produits ayant réellement des ventes sur le périmètre filtré
  const soldProducts = useMemo(
    () => (data?.products ?? []).filter((p: ProductItem) => (p.volume ?? 0) > 0),
    [data],
  );

  // Sélection : par défaut les 2 références les plus vendues
  const [selection, setSelection] = useState<(string | null)[]>([null, null, null]);
  const selectedIds = selection.map((id, idx) => id ?? (idx < 2 ? soldProducts[idx]?.id ?? null : null));
  const selected = selectedIds
    .map((id) => soldProducts.find((p: ProductItem) => p.id === id))
    .filter((p): p is ProductItem => Boolean(p));

  const totalSelectedVolume = selected.reduce((sum, p) => sum + (p.volume ?? 0), 0);

  const setSlot = (slot: number, id: string) =>
    setSelection((prev) => prev.map((v, i) => (i === slot ? id || null : v)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Swords className="size-5 text-orange-500" />
            Competitive Intelligence (Face-à-Face)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparaison de références sur les ventes observées dans le réseau E-Maquis (mêmes filtres de zone et de
            période).
          </p>
        </div>
      </div>

      <FilterBar />

      <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">Références comparées</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {isLoading
              ? 'Chargement des références…'
              : isError
                ? "API Market Intelligence indisponible."
                : `${soldProducts.length} références avec ventes sur le périmètre — croissance : ${
                    data?.comparisonLabel ?? 'période courante vs précédente'
                  }`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0, 1, 2].map((slot) => (
              <select
                key={slot}
                value={selectedIds[slot] ?? ''}
                onChange={(e) => setSlot(slot, e.target.value)}
                className="h-9 rounded-lg border border-border bg-background/60 px-2 text-xs text-foreground"
              >
                <option value="">{slot === 2 ? '— Troisième référence (optionnel) —' : '— Choisir une référence —'}</option>
                {soldProducts.map((p: ProductItem) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.brand})
                  </option>
                ))}
              </select>
            ))}
          </div>

          {selected.length < 2 ? (
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Calcul en cours…' : 'Sélectionnez au moins deux références ayant des ventes pour les comparer.'}
            </p>
          ) : (
            <div className={`grid grid-cols-1 gap-4 ${selected.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
              {selected.map((p, idx) => (
                <div key={p.id} className={`p-4 rounded-xl border space-y-3 ${SLOT_STYLES[idx]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground truncate">{p.name}</span>
                    <Badge variant="outline" className="shrink-0">
                      {p.brand}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume observé :</span>
                      <span className="font-bold font-mono">{(p.volume ?? 0).toLocaleString('fr-FR')} u.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Part relative (comparaison) :</span>
                      <span className="font-bold font-mono">{computeShareLocal(p.volume ?? 0, totalSelectedVolume)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Croissance :</span>
                      <span className={`font-bold font-mono ${growthColorClass(p.growth)}`}>{formatGrowth(p.growth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rotation :</span>
                      <span className="font-bold font-mono">{p.rotationRate} u./POS/sem</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Points de vente :</span>
                      <span className="font-bold font-mono">{p.posCount ?? 'n/d'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Communes principales :</span>
                      <span className="font-medium text-foreground text-right">
                        {p.topCommunes?.length ? p.topCommunes.join(', ') : 'Non localisé'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-lg bg-accent/40 border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="size-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              Ventes observées dans le réseau E-Maquis uniquement : ces chiffres ne représentent pas le marché ivoirien
              total. Plus le nombre de points de vente est faible, plus la comparaison est fragile.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
