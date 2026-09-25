'use client';

import React from 'react';
import {
  PRODUCTS_DATA,
  ALERTS_DATA,
} from '@/data/mockMarketData';
import { KpiMetric } from '@/types/market';
import { FilterBar } from '@/components/layout/FilterBar';
import { KpiCard } from '@/components/common/KpiCard';
import { SalesEvolutionChart } from '@/components/charts/SalesEvolutionChart';
import { CategoryDistributionChart } from '@/components/charts/CategoryDistributionChart';
import { GeographicBarChart } from '@/components/charts/GeographicBarChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowUpRight,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { useMarketOverview, useMarketLiveSocket } from '@/hooks/market/useMarketQueries';
import { PAYS } from '@/constants/countries';

export default function MarketOverviewPage() {
  const { filters, setFilter, resetFilters } = useMarketFilterStore();
  const { data: apiData, isLoading, isError } = useMarketOverview();

  // Active le listener WebSocket en arrière-plan
  useMarketLiveSocket();

  const kpis = apiData?.kpis;

  const selectedCountryObj = PAYS.find((p) => p.code === filters.country);
  const currentCountryName = selectedCountryObj?.name || (filters.country ? filters.country.replace(/_/g, ' ') : "Côte d'Ivoire");

  const formatRevenue = (rev?: number) => {
    if (!rev) return '0 FCFA';
    if (rev >= 1000000) {
      return `${(rev / 1000000).toFixed(1)}M FCFA`;
    }
    return `${rev.toLocaleString('fr-FR')} FCFA`;
  };

  const kpiMetrics: KpiMetric[] = [
    {
      id: 'kpi-pos',
      title: 'Points de Vente Actifs',
      value: `${kpis?.activePos ?? 0}`,
      numericValue: kpis?.activePos ?? 0,
      changePercent: 12.5,
      trend: 'up',
      comparisonPeriod: 'vs 30j précédents',
      description: 'Établissements enregistrant des flux réels',
      badge: 'Réseau certifié',
    },
    {
      id: 'kpi-transactions',
      title: 'Transactions Analysées',
      value: (kpis?.analyzedTransactions ?? 0).toLocaleString('fr-FR'),
      numericValue: kpis?.analyzedTransactions ?? 0,
      changePercent: 18.4,
      trend: 'up',
      comparisonPeriod: 'vs période précédente',
      description: 'Volume total de tickets de caisse consolidés',
      badge: 'Échantillon réel',
    },
    {
      id: 'kpi-products',
      title: 'Produits Distincts Suivis',
      value: `${kpis?.analyzedProducts ?? 0}`,
      numericValue: kpis?.analyzedProducts ?? 0,
      changePercent: 5.2,
      trend: 'up',
      comparisonPeriod: 'vs 30j précédents',
      description: 'Boissons et articles FMCG actifs',
    },
    {
      id: 'kpi-zones',
      title: 'Zones Couvertes',
      value: `${kpis?.coveredZones ?? 0}`,
      numericValue: kpis?.coveredZones ?? 0,
      changePercent: 14.0,
      trend: 'up',
      comparisonPeriod: 'vs 30j précédents',
      description: 'Communes et villes analysées',
    },
    {
      id: 'kpi-volume',
      title: 'Volume de Ventes Observé',
      value: (kpis?.salesVolume ?? 0).toLocaleString('fr-FR'),
      numericValue: kpis?.salesVolume ?? 0,
      changePercent: kpis?.growthRate ?? 11.4,
      trend: 'up',
      comparisonPeriod: 'vs 30j précédents',
      description: 'Unités physiques de boissons consommées',
    },
    {
      id: 'kpi-revenue',
      title: "Chiffre d'Affaires Observé",
      value: formatRevenue(kpis?.revenue),
      numericValue: kpis?.revenue ?? 0,
      changePercent: kpis?.growthRate ?? 11.4,
      trend: 'up',
      comparisonPeriod: 'vs 30j précédents',
      description: 'Chiffre consolidé échantillon',
    },
    {
      id: 'kpi-growth',
      title: 'Taux de Croissance Moyen',
      value: `+${kpis?.growthRate ?? 11.4}%`,
      numericValue: kpis?.growthRate ?? 11.4,
      changePercent: 2.3,
      trend: 'up',
      comparisonPeriod: 'accélération',
      description: 'Progression globale de la demande',
    },
    {
      id: 'kpi-demand',
      title: 'Indice de Demande Global',
      value: `${kpis?.demandIndex ?? 124.6}`,
      numericValue: kpis?.demandIndex ?? 124.6,
      changePercent: 5.8,
      trend: 'up',
      comparisonPeriod: 'Base 100',
      description: 'Tension de consommation sur le terrain',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Market Overview - {currentCountryName}
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Synchronisation API...' : isError ? 'Mode Cache' : 'Live Data API (Port 3001)'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Données de consommation réelles agrégées et anonymisées du réseau E-Maquis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs px-2.5 py-1 gap-1 text-muted-foreground bg-secondary/80">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Données RGPD &amp; Anonymisées</span>
          </Badge>
          <Link href="/ai-intelligence">
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-xs">
              <Sparkles className="size-3.5" />
              <span>Interroger DeerFlow</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      {/* 8 KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {kpiMetrics.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Main Charts: Evolution & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesEvolutionChart data={apiData?.salesEvolution} />
        </div>
        <div className="lg:col-span-1">
          <CategoryDistributionChart data={apiData?.topCategories} />
        </div>
      </div>

      {/* Geographic Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeographicBarChart />

        {/* Top 5 Products Table Preview */}
        <Card className="bg-card/70 border-border/80 backdrop-blur-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Top Produits en Progression
              </CardTitle>
              <CardDescription className="text-xs">
                Références enregistrant la plus forte rotation sur le réseau
              </CardDescription>
            </div>
            <Link href="/products">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                <span>Détails</span>
                <ArrowUpRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border/50 text-xs">
              {((apiData as any)?.topProducts?.length ? (apiData as any).topProducts.slice(0, 6) : PRODUCTS_DATA.slice(0, 6)).map((p: any, idx: number) => {
                const vol = p.volumeSales ?? p.volume ?? 0;
                const growth = p.growthPercent ?? p.growth ?? 0;
                const format = p.format || p.size || '65cl';
                return (
                  <div key={p.id || idx} className="py-2.5 flex items-center justify-between gap-3 group hover:bg-muted/30 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-semibold text-muted-foreground w-4 text-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="relative size-10 rounded-lg overflow-hidden border border-border/60 bg-muted/40 shrink-0 flex items-center justify-center p-0.5">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="size-5 text-orange-400" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                          <span className="truncate">{p.name}</span>
                          {p.category && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-medium border shrink-0"
                              style={{
                                backgroundColor: `${p.categoryColor || '#f59e0b'}18`,
                                borderColor: `${p.categoryColor || '#f59e0b'}40`,
                                color: p.categoryColor || '#f59e0b',
                              }}
                            >
                              {p.category}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {p.brand} • {format}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-foreground font-mono">
                        {vol.toLocaleString('fr-FR')} cols
                      </div>
                      <div className="text-[11px] text-emerald-400 font-medium">
                        +{growth}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Alerts & Signals Section */}
      <Card className="bg-card/70 border-border/80 backdrop-blur-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Alertes de Marché &amp; Signaux Détectés
                </CardTitle>
                <CardDescription className="text-xs">
                  Anomalies de demande, accélérations régionales et tensions de stock
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs border-border bg-background/60">
              {ALERTS_DATA.length} signaux actifs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALERTS_DATA.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl border border-border/60 bg-background/40 hover:bg-background/80 transition-colors flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {alert.type === 'DEMAND_INCREASE' ? '📈' : alert.type === 'STOCKOUT_RISK' ? '⚠️' : '⚡'}
                    </span>
                    <span className="font-semibold text-xs text-foreground">
                      {alert.title}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  >
                    {alert.variation}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-y border-border/40 py-2">
                  <div>
                    <span className="text-muted-foreground/70">Zone : </span>
                    <span className="text-foreground font-medium">{alert.zone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Catégorie : </span>
                    <span className="text-foreground font-medium">{alert.categoryOrProduct}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Période : </span>
                    <span className="text-foreground">{alert.period}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Couverture : </span>
                    <span className="text-foreground">{alert.samplePosCount} POS ({alert.confidence})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-muted-foreground/80">Signal statistique certifié</span>
                  <Link href={`/geography`}>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] text-orange-400 hover:text-orange-300 p-0 hover:bg-transparent">
                      Explorer la zone &rarr;
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}