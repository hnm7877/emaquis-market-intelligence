'use client';

import React from 'react';
import { KpiMetric } from '@/types/market';
import { FilterBar } from '@/components/layout/FilterBar';
import { KpiCard } from '@/components/common/KpiCard';
import dynamic from 'next/dynamic';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { periodLabel as filterPeriodLabel } from '@/components/layout/PeriodPicker';

// Graphiques chargés à la demande : la page et les indicateurs s'affichent tout de suite
const ChartSkeleton = ({ h = 'h-[340px]' }: { h?: string }) => (
  <div className={`${h} w-full animate-pulse rounded-xl border border-border/60 bg-card/50`} />
);
const SalesEvolutionChart = dynamic(() => import('@/components/charts/SalesEvolutionChart').then((m) => m.SalesEvolutionChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const CategoryDistributionChart = dynamic(
  () => import('@/components/charts/CategoryDistributionChart').then((m) => m.CategoryDistributionChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const GeographicBarChart = dynamic(() => import('@/components/charts/GeographicBarChart').then((m) => m.GeographicBarChart), {
  ssr: false,
  loading: () => <ChartSkeleton h="h-[420px]" />,
});

/** Squelette d'indicateur (au lieu d'afficher des zéros pendant le chargement) */
const KpiSkeleton = () => <div className="h-[132px] animate-pulse rounded-xl border border-border/60 bg-card/50" />;

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {hint && <span className="text-[11px] text-muted-foreground/80">{hint}</span>}
    </div>
  );
}
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
import { useMarketOverview } from '@/hooks/market/useMarketQueries';
import { PAYS } from '@/constants/countries';
import { formatVolumeValue } from '@/utils/volumeUnit';
import { formatGrowth, growthColorClass, growthTrend, isAvailable } from '@/utils/metrics';

export default function MarketOverviewPage() {
  const { filters, volumeUnit } = useMarketFilterStore();
  const { data: apiData, isLoading, isError, dataUpdatedAt } = useMarketOverview();
  const isLive = useMarketRealtimeStore((s) => s.isConnected);
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;

  const kpis = apiData?.kpis;

  const rawCountry = Array.isArray(filters.country) ? filters.country[0] : filters.country;
  const selectedCountryObj = PAYS.find((p) => p.code === rawCountry);
  const currentCountryName = selectedCountryObj?.name || (typeof rawCountry === 'string' && rawCountry && rawCountry !== 'all' ? rawCountry.replace(/_/g, ' ') : 'Tous les pays');

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

  // Activité commerciale d'abord, puis couverture du réseau
  const byId = new Map(kpiMetrics.map((m) => [m.id, m]));
  const headlineKpis = ['kpi-revenue', 'kpi-volume', 'kpi-transactions', 'kpi-growth'].map((id) => byId.get(id)!);
  const networkKpis = ['kpi-pos', 'kpi-products', 'kpi-zones', 'kpi-demand'].map((id) => byId.get(id)!);

  const alerts = apiData?.alerts ?? [];
  const topProducts: any[] = (apiData as any)?.topProducts ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* En-tête : périmètre, état du direct, accès rapides */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-amber-500/10 p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Vue d&apos;ensemble du marché</p>
            <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {currentCountryName.replace(/_/g, ' ')}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium ${
                  isError
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                    : isLive
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                      : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                <span className={`size-1.5 rounded-full ${isError ? 'bg-rose-500' : isLive ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground'}`} />
                {isError ? 'API indisponible' : isLive ? 'En direct' : 'Hors direct (rafraîchi chaque minute)'}
              </span>
              <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-muted-foreground">
                {filterPeriodLabel(typeof filters.dateRange === 'string' ? filters.dateRange : 'all', filters.startDate, filters.endDate)}
              </span>
              {updatedAt && <span className="text-muted-foreground">Mis à jour à {updatedAt}</span>}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-500" /> Données agrégées et anonymisées
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/autonomous-dashboard">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-orange-500/40 bg-orange-500/10 text-xs text-orange-400 hover:bg-orange-500/20">
                <Sparkles className="size-3.5" />
                <span>Bourse &amp; 3D</span>
              </Button>
            </Link>
            <Link href="/ai-intelligence">
              <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-xs text-white shadow-xs hover:from-orange-600 hover:to-amber-600">
                <Sparkles className="size-3.5" />
                <span>Interroger DeerFlow</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filtres (période, statut, zones, catégories, marques, types) */}
      <FilterBar />

      {/* Indicateurs : activité commerciale */}
      <section className="space-y-2.5">
        <SectionTitle title="Activité commerciale" hint={periodLabel} />
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {isLoading ? [0, 1, 2, 3].map((i) => <KpiSkeleton key={i} />) : headlineKpis.map((m) => <KpiCard key={m.id} metric={m} />)}
        </div>
      </section>

      {/* Indicateurs : couverture du réseau */}
      <section className="space-y-2.5">
        <SectionTitle title="Couverture du réseau" />
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {isLoading ? [0, 1, 2, 3].map((i) => <KpiSkeleton key={i} />) : networkKpis.map((m) => <KpiCard key={m.id} metric={m} />)}
        </div>
      </section>

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
