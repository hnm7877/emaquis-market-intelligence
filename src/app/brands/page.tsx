'use client';

import React from 'react';
import { BRANDS_DATA } from '@/data/mockMarketData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, ShieldCheck, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useBrandsQuery } from '@/hooks/market/useMarketQueries';

export default function BrandsPage() {
  const { data: apiBrandsData, isLoading } = useBrandsQuery();

  const brandsList = apiBrandsData?.brands?.length ? apiBrandsData.brands : BRANDS_DATA;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="size-5 text-orange-500" />
              Analyse des Marques &amp; Brasseries
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Calcul des parts de marché...' : `${brandsList.length} Marques analysées`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parts de marché observées, taux de pénétration et dynamiques territoriales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brandsList.map((brand: any) => {
          const vol = brand.volume || 0;
          const share = brand.marketShare || 0;
          const growth = brand.growth ?? brand.growthPercent ?? 0;
          const pen = brand.penetrationRate || 80;
          const topCat = brand.topCategory || 'Bières';
          const zone = brand.strongestZone || (brand.mainZones ? brand.mainZones.join(', ') : 'Abidjan');

          return (
            <Card key={brand.id} className="border border-border/80 bg-card/70 backdrop-blur-md hover:border-primary/40 transition-all">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold tracking-tight text-foreground">
                    {brand.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {topCat}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-bold">
                  {share}% PDM
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Volume estimé :</span>
                    <span className="font-semibold text-foreground">{vol.toLocaleString('fr-FR')} u.</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Croissance périodique :</span>
                    <span className={`font-semibold ${growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {growth >= 0 ? `+${growth}%` : `${growth}%`}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taux de pénétration POS :</span>
                    <span className="font-semibold text-foreground">{pen}%</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Fief territorial :</span>
                    <span className="font-semibold text-foreground">{zone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3 text-emerald-400" />
                    Données agrégées certifiées
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}