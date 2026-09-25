'use client';

import React from 'react';
import { PRODUCTS_DATA } from '@/data/mockMarketData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Boxes, AlertTriangle } from 'lucide-react';
import { useStockIntelligenceQuery } from '@/hooks/market/useMarketQueries';

export default function StockIntelligencePage() {
  const { data: apiStockData, isLoading } = useStockIntelligenceQuery();
  const atRisk = PRODUCTS_DATA.filter((p) => p.stockoutRisk !== 'Faible');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Boxes className="size-5 text-orange-500" />
              Stock Intelligence &amp; Risques de Rupture
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Analyse des stocks...' : `${atRisk.length} Références sous tension`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aide proactive aux brasseries et distributeurs pour anticiper les réassorts et éviter les ruptures en maquis.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs">
        <AlertTriangle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-foreground block text-sm">
            {atRisk.length} références sous haute tension de réapprovisionnement
          </span>
          <p className="text-muted-foreground mt-1">
            Les points de vente de Cocody et Yopougon enregistrent une accélération de la demande supérieure aux fréquences de livraison standard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {atRisk.map((p) => (
          <Card key={p.id} className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground text-sm block">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{p.brand} • {p.format}</span>
              </div>
              <Badge
                variant="outline"
                className={p.stockoutRisk === 'Élevé' ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-amber-500 text-amber-500 bg-amber-500/10'}
              >
                Risque {p.stockoutRisk}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
              <div>
                <span className="text-[10px] text-muted-foreground block">Rotation</span>
                <span className="font-bold font-mono">{p.rotationRate}x / sem.</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Fréquence réassort</span>
                <span className="font-bold font-mono">Tous les {p.reorderFrequencyDays} jours</span>
              </div>
            </div>

            <div className="text-xs">
              <span className="text-muted-foreground text-[10px] block">Zones de rupture probable :</span>
              <span className="font-medium text-foreground">{p.topZones?.join(', ') || 'Abidjan'}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}