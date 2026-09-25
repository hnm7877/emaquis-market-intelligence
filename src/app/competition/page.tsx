'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CompetitionPage() {
  const [selectedMatchup, setSelectedMatchup] = useState('BEER_MAINSTREAM');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Swords className="size-5 text-orange-500" />
            Competitive Intelligence (Face-à-Face)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparatifs directs de marques et références concurrentes sur les mêmes zones et périodes.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={selectedMatchup === 'BEER_MAINSTREAM' ? 'default' : 'outline'}
          onClick={() => setSelectedMatchup('BEER_MAINSTREAM')}
          className="text-xs"
        >
          Bock 65cl (Solibra) vs Ivoire 65cl (Brassivoire)
        </Button>
        <Button
          size="sm"
          variant={selectedMatchup === 'ENERGY' ? 'default' : 'outline'}
          onClick={() => setSelectedMatchup('ENERGY')}
          className="text-xs"
        >
          XXL Energy vs Vody / Red Bull
        </Button>
      </div>

      <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">
            Duel Commercial : Bock 65cl vs Ivoire Spéciale 65cl
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Données comparatives sur les 64 établissements du panel E-Maquis (30 derniers jours)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Bock 65cl (Drogba)</span>
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                  SOLIBRA
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume de ventes :</span>
                  <span className="font-bold font-mono">34 120 cols</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Part relative :</span>
                  <span className="font-bold font-mono">60.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rotation hebdo :</span>
                  <span className="font-bold font-mono">4.8x / semaine</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bastions forts :</span>
                  <span className="font-medium text-foreground">Yopougon, Abobo</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Ivoire Spéciale 65cl</span>
                <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                  BRASSIVOIRE
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume de ventes :</span>
                  <span className="font-bold font-mono">22 450 cols</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Part relative :</span>
                  <span className="font-bold font-mono">39.7%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rotation hebdo :</span>
                  <span className="font-bold font-mono">3.9x / semaine</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bastions forts :</span>
                  <span className="font-medium text-foreground">Cocody, Marcory</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-accent/40 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500 flex-shrink-0" />
            <span>Indice de confiance statistique : <strong>96%</strong> (calculé sur 57 744 transactions consolidées).</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
