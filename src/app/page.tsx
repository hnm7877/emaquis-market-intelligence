'use client';

import React from 'react';
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
import { formatVolumeValue } from '@/utils/volumeUnit';
import { formatGrowth, growthColorClass, growthTrend, isAvailable } from '@/utils/metrics';

export default function MarketOverviewPage() {
  const { filters, setFilter, resetFilters, volumeUnit } = useMarketFilterStore();
  const { data: apiData, isLoading, isError } = useMarketOverview();

  // Active le listener WebSocket en arrière-plan
  useMarketLiveSocket();

  const kpis = apiData?.kpis;

  const rawCountry = Array.isArray(filters.country) ? filters.country[0] : filters.country;
  const selectedCountryObj = PAYS.find((p) => p.code === rawCountry);
  const currentCountryName = selectedCountryObj?.name || (typeof rawCountry === 'string' ? rawCountry.replace(/_/g, ' ') : "Côte d'Ivoire");

  const formatRevenue = (rev?: number) => {
    if (!rev) return '0 FCFA';
    if (rev >= 1000000) {
      return `${(rev / 1000000).toFixed(1)}M FCFA`;
    }
    return `${rev.toLocaleString('fr-FR')} FCFA`;
  };

  // Libellé réel de la comparaison calculée par l'API (ex. « 30 derniers jours vs 30 jours précédents »)
  const periodLabel = apiData?.comparison?.label
    ? `${apiData.comparison.label}`
    : 'vs période précédente';

  /** Variation en valeur absolue + sens, ou n/d si non calculable */
  const change = (value: number | null | undefined) => ({
    changePercent: isAvailable(value) ? Math.abs(value) : null,
    trend: growthTrend(value),
  });

  // Conversion dynamique du KPI volume selon l'unité de mesure sélectionnée
  const activeVolumeUnit = volumeUnit || 'cols';
  const formattedKpiVolume = formatVolumeValue(kpis?.salesVolume ?? 0, activeVolumeUnit, kpis?.revenue);
  const growthRate = kpis?.growthRate ?? null;
  const demandIndex = kpis?.demandIndex ?? null;
  const acceleration = kpis?.acceleration ?? null;

  const kpiMetrics: KpiMetric[] = [
    {
      id: 'kpi-pos',
      title: 'Points de Vente Actifs',
      value: `${kpis?.activePos ?? 0}`,
      numericValue: kpis?.activePos ?? 0,
      ...change(kpis?.posGrowth),
      comparisonPeriod: periodLabel,
      description: 'Établissements ayant enregistré au moins une vente sur la période',
      badge: 'Réseau E-Maquis',
    },
    {
      id: 'kpi-transactions',
      title: 'Transactions Analysées',
      value: (kpis?.analyzedTransactions ?? 0).toLocaleString('fr-FR'),
      numericValue: kpis?.analyzedTransactions ?? 0,
      ...change(kpis?.transactionsGrowth),
      comparisonPeriod: periodLabel,
      description: 'Tickets de caisse consolidés',
      badge: 'Échantillon réel',
    },
    {
      id: 'kpi-products',
      title: 'Produits Distincts Suivis',
      value: `${kpis?.analyzedProducts ?? 0}`,
      numericValue: kpis?.analyzedProducts ?? 0,
      changePercent: null,
      trend: 'neutral',
      comparisonPeriod: 'sans comparaison',
      description: 'Références du catalogue dans le périmètre filtré',
    },
    {
      id: 'kpi-zones',
      title: 'Zones Couvertes',
      value: `${kpis?.coveredZones ?? 0}`,
      numericValue: kpis?.coveredZones ?? 0,
      changePercent: null,
      trend: 'neutral',
      comparisonPeriod: 'sans comparaison',
      description: 'Communes / villes des points de vente actifs',
    },
    {
      id: 'kpi-volume',
      title: `Volume Observé (${formattedKpiVolume.unit})`,
      value: formattedKpiVolume.formatted,
      numericValue: formattedKpiVolume.value,
      ...change(kpis?.volumeGrowth ?? growthRate),
      comparisonPeriod: periodLabel,
      description: `Consommation consolidée exprimée en ${formattedKpiVolume.unit}`,
    },
    {
      id: 'kpi-revenue',
      title: "Chiffre d'Affaires Observé",
      value: formatRevenue(kpis?.revenue),
      numericValue: kpis?.revenue ?? 0,
      ...change(kpis?.revenueGrowth),
      comparisonPeriod: periodLabel,
      description: 'Chiffre consolidé échantillon',
    },
    {
      id: 'kpi-growth',
      title: 'Croissance des Volumes',
      value: formatGrowth(growthRate),
      numericValue: growthRate ?? 0,
      ...change(acceleration),
      comparisonPeriod: isAvailable(acceleration)
        ? acceleration >= 0
          ? 'pts d’accélération'
          : 'pts de ralentissement'
        : 'accélération n/d',
      description: 'Volume période courante vs période précédente',
    },
    {
      id: 'kpi-demand',
      title: 'Indice de Demande',
      value: isAvailable(demandIndex) ? `${demandIndex}` : 'n/d',
      numericValue: demandIndex ?? 0,
      ...change(isAvailable(demandIndex) ? +(demandIndex - 100).toFixed(1) : null),
      comparisonPeriod: 'vs moyenne des 3 dernières périodes (base 100)',
      description: 'Volume courant rapporté à la moyenne des périodes de référence',
    },
  ];

  const alerts = apiData?.alerts ?? [];
  const topProducts: any[] = (apiData as any)?.topProducts ?? [];

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
              {isLoading ? 'Synchronisation API...' : isError ? 'API indisponible' : 'Données live API'}
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

      {/* Filter Bar avec Sélecteur d'Unité et Auto-sync */}
      <FilterBar />

      {/* Message d'info si filtre actif */}
      {filters.status && filters.status !== 'valid' && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-500">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            <span>
              Filtre statut actif : <strong>{filters.status}</strong>. Les indicateurs et la carte thermique s'adaptent dynamiquement.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilter('status', 'valid')}
            className="text-[11px] underline text-amber-400 hover:text-amber-300 font-medium"
          >
            Revenir aux ventes validées
          </button>
        </div>
      )}

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

      {/* Geographic Breakdown (Carte Thermique Snapchat + Histogramme) & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeographicBarChart />

        {/* Top 5 Products Table Preview */}
        <Card className="bg-card/70 border-border/80 backdrop-blur-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Top Produits (volume)
              </CardTitle>
              <CardDescription className="text-xs">
                Références les plus vendues — croissance {periodLabel}
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
              {!isLoading && topProducts.length === 0 && (
                <p className="py-6 text-center text-muted-foreground">
                  Aucune vente produit observée sur ce périmètre.
                </p>
              )}
              {topProducts.slice(0, 6).map((p: any, idx: number) => {
                const vol = p.volumeSales ?? p.volume ?? 0;
                const growth = p.growthPercent ?? p.growth ?? null;
                const format = p.format || p.size || '';
                const formattedProdVol = formatVolumeValue(vol, activeVolumeUnit, p.revenue);

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
                          {p.brand}{format ? ` • ${format}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-foreground font-mono">
                        {formattedProdVol.formatted}
                      </div>
                      <div className={`text-[11px] font-medium ${growthColorClass(growth)}`}>
                        {formatGrowth(growth)}
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
              {alerts.length} signaux actifs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!isLoading && alerts.length === 0 && (
              <p className="md:col-span-2 py-4 text-center text-xs text-muted-foreground">
                Aucune variation significative détectée ({periodLabel}). Un signal est publié à partir de ±20 %,
                avec au moins 3 points de vente et 30 unités sur la période précédente.
              </p>
            )}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl border border-border/60 bg-background/40 hover:bg-background/80 transition-colors flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {alert.type === 'DEMAND_INCREASE' ? '📈' : alert.type === 'DEMAND_DROP' ? '📉' : '⚡'}
                    </span>
                    <span className="font-semibold text-xs text-foreground">
                      {alert.title}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono px-1.5 py-0 border ${
                      alert.variation >= 0
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {formatGrowth(alert.variation)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-y border-border/40 py-2">
                  <div>
                    <span className="text-muted-foreground/70">Zone : </span>
                    <span className="text-foreground font-medium">{alert.zone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Catégorie : </span>
                    <span className="text-foreground font-medium">{alert.category}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Période : </span>
                    <span className="text-foreground">{alert.period}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">Couverture : </span>
                    <span className="text-foreground">{alert.coveragePos} POS (confiance {alert.confidence})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-muted-foreground/80">Ventes observées dans le réseau E-Maquis</span>
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
