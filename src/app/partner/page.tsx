'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export default function PartnerPortalPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="size-5 text-orange-500" />
            Portail Partenaire B2B
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestion de vos abonnements Market Intelligence et clés d'API.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border border-border/80 bg-card/70 space-y-3">
          <Badge variant="outline" className="text-xs">MARKET BASIC</Badge>
          <span className="text-xl font-bold text-foreground block">Gratuit / Découverte</span>
          <p className="text-xs text-muted-foreground">Vue d'ensemble macro et rapports mensuels de base.</p>
          <Button variant="outline" size="sm" className="w-full text-xs">Actuel</Button>
        </Card>

        <Card className="p-5 border-2 border-primary bg-primary/5 space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <Badge className="bg-primary text-primary-foreground text-xs">MARKET PRO</Badge>
            <span className="text-[10px] font-bold text-orange-500 uppercase">Recommandé</span>
          </div>
          <span className="text-xl font-bold text-foreground block">Sur Devis / Mensuel</span>
          <p className="text-xs text-muted-foreground">Analyses géographiques fines, détection de ruptures, exports Excel et alertes temps réel.</p>
          <Button size="sm" className="w-full text-xs bg-primary text-primary-foreground font-semibold">Souscrire au Plan Pro</Button>
        </Card>

        <Card className="p-5 border border-border/80 bg-card/70 space-y-3">
          <Badge variant="outline" className="text-xs">MARKET ENTERPRISE</Badge>
          <span className="text-xl font-bold text-foreground block">Accès Illimité & API</span>
          <p className="text-xs text-muted-foreground">Accès API programmatique, agent IA DeerFlow dédié, rapports sur mesure et conseil FMCG.</p>
          <Button variant="outline" size="sm" className="w-full text-xs">Contacter l'équipe</Button>
        </Card>
      </div>
    </div>
  );
}
