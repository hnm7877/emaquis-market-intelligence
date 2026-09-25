'use client';

import React from 'react';
import { PROMOTIONS_DATA } from '@/data/mockMarketData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';

export default function PromotionsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            Mesure d'Impact & Uplift des Promotions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Évaluation quantitative de l'effet des campagnes promotionnelles (Avant / Pendant / Après).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {PROMOTIONS_DATA.map((promo) => (
          <Card key={promo.id} className="border border-border/80 bg-card/70 backdrop-blur-md p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{promo.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {promo.brand}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  Produit : <strong>{promo.product}</strong> • Zone : {promo.zone} • Période : {promo.startDate} au {promo.endDate} ({promo.durationDays}j)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Uplift mesuré :</span>
                <span className="text-base font-extrabold font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  +{promo.upliftPercent}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs pt-3 border-t border-border/50">
              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Ventes Avant Campagne</span>
                <span className="text-base font-bold font-mono text-foreground">{promo.beforeSalesDaily} cols/j</span>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span className="text-[10px] text-orange-500 font-semibold block">Ventes Pendant Activation</span>
                <span className="text-base font-bold font-mono text-orange-600 dark:text-orange-400">{promo.duringSalesDaily} cols/j</span>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground block">Rémanence Après Activation</span>
                <span className="text-base font-bold font-mono text-emerald-500">{promo.afterSalesDaily} cols/j</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
