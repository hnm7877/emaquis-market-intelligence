'use client';

import React from 'react';
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, ShieldCheck, MapPin, Store, Receipt, Calendar, Layers, CheckCircle2 } from 'lucide-react';
import { useDataCoverageQuery } from '@/hooks/market/useMarketQueries';

export default function DataCoveragePage() {
  const { data: coverageData, isLoading, isError } = useDataCoverageQuery();

  // Aucune valeur par défaut : tant que l'API n'a pas répondu, on affiche « … »
  const overview = coverageData?.networkOverview;
  const fmt = (n?: number | null) => (typeof n === 'number' ? n.toLocaleString('fr-FR') : '…');
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '…');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Database className="size-5 text-orange-500" />
              Transparence &amp; Couverture des Données E-Maquis
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Interrogation MongoDB...' : isError ? 'API indisponible' : 'Source Réelle Base Globale'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Description certifiée de l&apos;échantillon réel utilisé pour nos indicateurs de marché en Côte d&apos;Ivoire.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-border/80 bg-card/70 text-center space-y-1 backdrop-blur-xs">
          <Store className="size-5 text-orange-500 mx-auto" />
          <span className="text-2xl font-extrabold text-foreground font-mono block">
            {fmt(overview?.activeEstablishments ?? overview?.registeredEstablishments)}
          </span>
          <span className="text-xs text-muted-foreground">
            Établissements avec ventes ({fmt(overview?.registeredEstablishments)} comptes enregistrés)
          </span>
        </Card>
        <Card className="p-4 border border-border/80 bg-card/70 text-center space-y-1 backdrop-blur-xs">
          <Receipt className="size-5 text-emerald-500 mx-auto" />
          <span className="text-2xl font-extrabold text-foreground font-mono block">
            {fmt(overview?.totalAnalyzedTransactions)}
          </span>
          <span className="text-xs text-muted-foreground">Transactions consolidées</span>
        </Card>
        <Card className="p-4 border border-border/80 bg-card/70 text-center space-y-1 backdrop-blur-xs">
          <MapPin className="size-5 text-blue-500 mx-auto" />
          <span className="text-2xl font-extrabold text-foreground font-mono block">
            {fmt(overview?.communesCovered)} communes
          </span>
          <span className="text-xs text-muted-foreground">
            Réparties sur {fmt(overview?.citiesCovered)} villes ({fmt(overview?.localizedEstablishments)} établissements localisés)
          </span>
        </Card>
        <Card className="p-4 border border-border/80 bg-card/70 text-center space-y-1 backdrop-blur-xs">
          <ShieldCheck className="size-5 text-amber-500 mx-auto" />
          <span className="text-2xl font-extrabold text-foreground font-mono block">Agrégées</span>
          <span className="text-xs text-muted-foreground">Données de ventes, sans donnée consommateur</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border border-border/80 bg-card/70 space-y-2.5">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            <Layers className="size-4 text-orange-500" />
            <span>Catalogue Normalisé Produits &amp; Catégories</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="bg-background/60 p-2.5 rounded-lg border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Références SKU :</span>
              <span className="text-lg font-mono font-bold text-foreground">
                {fmt(overview?.catalogProductsCount)}
              </span>
            </div>
            <div className="bg-background/60 p-2.5 rounded-lg border border-border/60">
              <span className="text-muted-foreground block text-[11px]">Catégories globales :</span>
              <span className="text-lg font-mono font-bold text-foreground">
                {fmt(overview?.catalogCategoriesCount)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-border/80 bg-card/70 space-y-2.5">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            <Calendar className="size-4 text-emerald-500" />
            <span>Profondeur Historique des Données</span>
          </div>
          <div className="bg-background/60 p-2.5 rounded-lg border border-border/60 text-xs">
            <span className="text-muted-foreground block text-[11px]">Période d&apos;observation :</span>
            <span className="text-lg font-mono font-bold text-foreground">
              {fmt(overview?.dateSpanMonths)} mois
            </span>
            <span className="text-muted-foreground block text-[11px] mt-1">
              Du {fmtDate(overview?.firstSaleDate)} au {fmtDate(overview?.lastSaleDate)}
            </span>
          </div>
        </Card>
      </div>

      <Card className="p-6 border border-border/80 bg-card/70 space-y-3 text-xs leading-relaxed backdrop-blur-xs">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-500" />
          Règle Fondamentale de Méthodologie &amp; Éthique des Données
        </CardTitle>
        <p className="text-muted-foreground">
          Conformément aux directives du produit, les indicateurs présentés sur E-Maquis Market Intelligence
          représentent exclusivement les <strong>ventes observées dans le réseau E-Maquis</strong> et ne doivent pas
          être extrapolés sans modèle économétrique au marché ivoirien global.
        </p>
        {overview?.methodology && <p className="text-muted-foreground">{overview.methodology}</p>}
        <p className="text-muted-foreground">
          Toutes les métadonnées nominatives de consommateurs sont rigoureusement exclues dès l&apos;ingestion.
          Aucun nom individuel, numéro de téléphone personnel ou identifiant privé n&apos;est stocké dans la couche
          analytique.
        </p>
      </Card>
    </div>
  );
}