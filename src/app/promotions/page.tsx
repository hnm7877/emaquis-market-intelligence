'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Info } from 'lucide-react';
import { usePromotionsQuery } from '@/hooks/market/useMarketQueries';
import { formatGrowth } from '@/utils/metrics';

interface PromotionImpactItem {
  id: string;
  title: string;
  brand?: string;
  period?: string;
  beforeSalesDaily: number;
  duringSalesDaily: number;
  afterSalesDaily: number;
  upliftPercent: number | null;
}

export default function PromotionsPage() {
  const { data, isLoading, isError } = usePromotionsQuery();
  const promotions: PromotionImpactItem[] = data?.promotions ?? [];
  const availability = data?.dataAvailability;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            Mesure d&apos;Impact &amp; Uplift des Promotions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Évaluation quantitative de l&apos;effet des campagnes promotionnelles (Avant / Pendant / Après).
          </p>
        </div>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Chargement des promotions…</p>}
      {isError && <p className="text-xs text-rose-400">Impossible de joindre l&apos;API Market Intelligence.</p>}

      {!isLoading && promotions.length === 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs">
          <Info className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground block text-sm">Aucune mesure d&apos;uplift disponible</span>
            <p className="text-muted-foreground mt-1">
              {availability?.message ??
                "Aucune promotion consolidée n'est disponible pour le moment."}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {promotions.map((promo) => (
          <Card key={promo.id} className="border border-border/80 bg-card/70 backdrop-blur-md p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{promo.title}</span>
                  {promo.brand && (
                    <Badge variant="outline" className="text-[10px]">
                      {promo.brand}
                    </Badge>
                  )}
                </div>
                {promo.period && <span className="text-xs text-muted-foreground">Période : {promo.period}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Uplift mesuré :</span>
                <span className="text-base font-extrabold font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {formatGrowth(promo.upliftPercent)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-3 border-t border-border/50">
              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Ventes Avant Campagne</span>
                <span className="text-base font-bold font-mono text-foreground">{promo.beforeSalesDaily} u./j</span>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span className="text-[10px] text-orange-500 font-semibold block">Ventes Pendant Activation</span>
                <span className="text-base font-bold font-mono text-orange-600 dark:text-orange-400">
                  {promo.duringSalesDaily} u./j
                </span>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Ventes Après Activation</span>
                <span className="text-base font-bold font-mono text-emerald-500">{promo.afterSalesDaily} u./j</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
