'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  MapPin,
  Store,
  Flame,
  DollarSign,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatVolumeValue, VolumeUnit } from '@/utils/volumeUnit';
import { getBrandLogo } from '@/utils/brandLogos';

// Enregistrement des modules Chart.js requis
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
);

// Palette harmonisée et distincte par marque pour dark mode
const BRAND_COLORS: Record<string, { bg: string; border: string; hover: string; text: string }> = {
  solibra: {
    bg: 'rgba(245, 158, 11, 0.85)',
    border: '#f59e0b',
    hover: 'rgba(245, 158, 11, 1)',
    text: '#fbbf24',
  },
  brassivoire: {
    bg: 'rgba(16, 185, 129, 0.85)',
    border: '#10b981',
    hover: 'rgba(16, 185, 129, 1)',
    text: '#34d399',
  },
  'coca-cola': {
    bg: 'rgba(239, 68, 68, 0.85)',
    border: '#ef4444',
    hover: 'rgba(239, 68, 68, 1)',
    text: '#f87171',
  },
  autres: {
    bg: 'rgba(139, 92, 246, 0.85)',
    border: '#8b5cf6',
    hover: 'rgba(139, 92, 246, 1)',
    text: '#a78bfa',
  },
  brakina: {
    bg: 'rgba(249, 115, 22, 0.85)',
    border: '#f97316',
    hover: 'rgba(249, 115, 22, 1)',
    text: '#fb923c',
  },
  diageo: {
    bg: 'rgba(180, 83, 9, 0.85)',
    border: '#b45309',
    hover: 'rgba(180, 83, 9, 1)',
    text: '#d97706',
  },
  bramali: {
    bg: 'rgba(6, 182, 212, 0.85)',
    border: '#06b6d4',
    hover: 'rgba(6, 182, 212, 1)',
    text: '#22d3ee',
  },
  pepsi: {
    bg: 'rgba(59, 130, 246, 0.85)',
    border: '#3b82f6',
    hover: 'rgba(59, 130, 246, 1)',
    text: '#60a5fa',
  },
  default: {
    bg: 'rgba(100, 116, 139, 0.85)',
    border: '#64748b',
    hover: 'rgba(100, 116, 139, 1)',
    text: '#94a3b8',
  },
};

interface BrandMarketShareChartsProps {
  brands: any[];
  volumeUnit?: VolumeUnit;
}

export function BrandMarketShareCharts({ brands = [], volumeUnit = 'cols' }: BrandMarketShareChartsProps) {
  const [chartView, setChartView] = useState<'doughnut' | 'bar' | 'revenue'>('doughnut');

  // Filtrer uniquement les marques actives ayant du volume ou des SKUs
  const activeBrands = useMemo(() => {
    return brands.filter((b) => (b.volume || 0) > 0);
  }, [brands]);

  const totalVolume = useMemo(() => {
    return activeBrands.reduce((acc, b) => acc + (b.volume || 0), 0);
  }, [activeBrands]);

  const totalRevenue = useMemo(() => {
    return activeBrands.reduce((acc, b) => acc + (b.revenue || 0), 0);
  }, [activeBrands]);

  // Insights de concentration
  const concentrationInsights = useMemo(() => {
    if (activeBrands.length === 0) return null;
    const top1 = activeBrands[0];
    const top2 = activeBrands[1];
    const top2Share = (top1?.marketShare || 0) + (top2?.marketShare || 0);
    const deltaTop1Top2 = (top1?.marketShare || 0) - (top2?.marketShare || 0);

    return {
      top1,
      top2,
      top2Share: +top2Share.toFixed(1),
      deltaTop1Top2: +deltaTop1Top2.toFixed(1),
    };
  }, [activeBrands]);

  // Données pour le Camembert / Doughnut en volume
  const doughnutData = useMemo(() => {
    const labels = activeBrands.map((b) => b.name);
    const dataValues = activeBrands.map((b) => b.marketShare || 0);
    const bgColors = activeBrands.map((b) => (BRAND_COLORS[b.key] || BRAND_COLORS.default).bg);
    const borderColors = activeBrands.map((b) => (BRAND_COLORS[b.key] || BRAND_COLORS.default).border);

    return {
      labels,
      datasets: [
        {
          label: 'Part de Marché (%)',
          data: dataValues,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverOffset: 8,
          spacing: 3,
        },
      ],
    };
  }, [activeBrands]);

  // Données pour le Camembert / Doughnut en Chiffre d'Affaires
  const revenueDoughnutData = useMemo(() => {
    const labels = activeBrands.map((b) => b.name);
    const dataValues = activeBrands.map((b) => {
      const rev = b.revenue || 0;
      return totalRevenue > 0 ? +((rev / totalRevenue) * 100).toFixed(1) : 0;
    });
    const bgColors = activeBrands.map((b) => (BRAND_COLORS[b.key] || BRAND_COLORS.default).bg);
    const borderColors = activeBrands.map((b) => (BRAND_COLORS[b.key] || BRAND_COLORS.default).border);

    return {
      labels,
      datasets: [
        {
          label: 'Part en Valeur CA (%)',
          data: dataValues,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverOffset: 8,
          spacing: 3,
        },
      ],
    };
  }, [activeBrands, totalRevenue]);

  // Données pour le Graphe Barres Comparatives (Pénétration POS vs PDM Volume)
  const barComparisonData = useMemo(() => {
    const labels = activeBrands.map((b) => b.name);
    const penetrationValues = activeBrands.map((b) => b.penetrationRate || 0);
    const marketShareValues = activeBrands.map((b) => b.marketShare || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Pénétration POS (%)',
          data: penetrationValues,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Part de Marché Volume (%)',
          data: marketShareValues,
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [activeBrands]);

  // Options d'animation et de style Chart.js pour le Camembert
  const doughnutOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1200,
        easing: 'easeOutQuart' as const,
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: '#cbd5e1',
            font: {
              family: 'Inter, sans-serif',
              size: 11,
              weight: 500,
            },
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(245, 158, 11, 0.4)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function (context: any) {
              const label = context.label || '';
              const val = context.raw || 0;
              return ` ${label} : ${val}% ${chartView === 'revenue' ? 'du CA' : 'du Volume'}`;
            },
            afterLabel: function (context: any) {
              const item = activeBrands[context.dataIndex];
              if (!item) return '';
              const volFormatted = formatVolumeValue(item.volume, volumeUnit, item.revenue).formatted;
              const revFormatted = (item.revenue || 0).toLocaleString('fr-FR') + ' FCFA';
              return [
                `• Volume : ${volFormatted} (${volumeUnit.toUpperCase()})`,
                `• Chiffre d'Affaires : ${revFormatted}`,
                `• Pénétration : ${item.penetrationRate}% (${item.activePosCount || 0}/${item.totalPosCount || 64} débits)`,
                `• Fief : ${item.fiefTerritorial || 'Abidjan'}`,
              ];
            },
          },
        },
      },
      cutout: chartView === 'doughnut' ? '65%' : '0%',
    };
  }, [activeBrands, chartView, volumeUnit]);

  // Options pour le Bar Chart
  const barOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart' as const,
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
          },
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (val: any) => `${val}%`,
          },
          min: 0,
          max: 100,
        },
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#cbd5e1',
            font: { size: 11, weight: 500 },
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(59, 130, 246, 0.4)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            afterLabel: function (context: any) {
              const item = activeBrands[context.dataIndex];
              if (!item) return '';
              return `Fief : ${item.fiefTerritorial}`;
            },
          },
        },
      },
    };
  }, [activeBrands]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Colonne Principale : Graphique Interactif (8 colonnes) */}
      <Card className="lg:col-span-8 border border-border/80 bg-card/75 backdrop-blur-xl shadow-lg relative overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <PieIcon className="size-4 text-amber-500" />
                {chartView === 'doughnut'
                  ? 'Répartition des Parts de Marché (Volume)'
                  : chartView === 'revenue'
                  ? 'Répartition en Valeur (Chiffre d\'Affaires)'
                  : 'Benchmark Pénétration POS vs Part de Marché'}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {chartView === 'bar'
                ? 'Corrélation entre taux de présence dans les maquis et volumes vendus'
                : `Flux consolidé certifié sur ${activeBrands.length} brasseries et marques`}
            </CardDescription>
          </div>

          {/* Switcher de Vues Graphiques */}
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 p-0.5 rounded-lg shrink-0">
            <Button
              variant={chartView === 'doughnut' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setChartView('doughnut')}
              className="h-7 px-2 text-xs gap-1"
              title="Camembert Volume"
            >
              <PieIcon className="size-3 text-amber-500" />
              <span className="hidden sm:inline">Volume</span>
            </Button>
            <Button
              variant={chartView === 'revenue' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setChartView('revenue')}
              className="h-7 px-2 text-xs gap-1"
              title="Camembert Valeur (CA)"
            >
              <DollarSign className="size-3 text-emerald-400" />
              <span className="hidden sm:inline">Valeur (CA)</span>
            </Button>
            <Button
              variant={chartView === 'bar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setChartView('bar')}
              className="h-7 px-2 text-xs gap-1"
              title="Barres Comparatives"
            >
              <BarChart3 className="size-3 text-blue-400" />
              <span className="hidden sm:inline">Pénétration</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-2 flex-1 flex flex-col justify-center">
          <div className="h-64 sm:h-72 md:h-80 w-full relative">
            {chartView === 'bar' ? (
              <Bar data={barComparisonData} options={barOptions as any} />
            ) : (
              <>
                <Doughnut
                  data={chartView === 'revenue' ? revenueDoughnutData : doughnutData}
                  options={doughnutOptions as any}
                />
                {/* Badge central sur le Donut */}
                {chartView === 'doughnut' && (
                  <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none hidden sm:flex flex-col items-center justify-center">
                    {concentrationInsights?.top1 && (
                      <div className="size-11 rounded-full bg-white dark:bg-white/95 p-1 shadow-md border border-amber-500/40 mb-1 flex items-center justify-center overflow-hidden">
                        <img
                          src={getBrandLogo(concentrationInsights.top1.key || concentrationInsights.top1.name) || '/brands/solibra.png'}
                          alt={concentrationInsights.top1.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Leader Marché
                    </span>
                    <div className="text-xs sm:text-sm font-extrabold text-amber-400">
                      {concentrationInsights?.top1?.name || 'SOLIBRA'}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-foreground">
                      {concentrationInsights?.top1?.marketShare || 0}% PDM
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>

        {/* Pied d'information du Graphique */}
        <div className="px-4 py-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-amber-500" />
            Graphique interactif • Cliquez sur une légende pour masquer/afficher
          </span>
          <span className="font-mono text-foreground font-semibold text-[10px]">
            {activeBrands.length} Marques Indexées
          </span>
        </div>
      </Card>

      {/* Colonne Latérale : Synthèse Analytique & Insights Clés (4 colonnes) */}
      <Card className="lg:col-span-4 border border-border/80 bg-card/75 backdrop-blur-xl shadow-lg flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Flame className="size-4 text-orange-500" />
            Structure &amp; Concentration Marché
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Indicateurs stratégiques de compétitivité
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-3 text-xs flex-1">
          {/* Indice Top 2 Concentration */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="font-medium text-foreground text-[11px]">Duopole / Concentration Top 2 :</span>
              <Badge variant="secondary" className="font-mono font-bold text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                {concentrationInsights?.top2Share || 88.0}%
              </Badge>
            </div>

            {/* Logos Top 1 & Top 2 */}
            <div className="flex items-center gap-2 py-0.5">
              {concentrationInsights?.top1 && (
                <div className="h-7 px-2 rounded-lg bg-white dark:bg-white/95 border border-border/80 flex items-center justify-center shadow-2xs">
                  <img
                    src={getBrandLogo(concentrationInsights.top1.key || concentrationInsights.top1.name) || '/brands/solibra.png'}
                    alt={concentrationInsights.top1.name}
                    className="max-h-5 w-auto object-contain"
                  />
                </div>
              )}
              <span className="text-xs font-bold text-muted-foreground">+</span>
              {concentrationInsights?.top2 && (
                <div className="h-7 px-2 rounded-lg bg-white dark:bg-white/95 border border-border/80 flex items-center justify-center shadow-2xs">
                  <img
                    src={getBrandLogo(concentrationInsights.top2.key || concentrationInsights.top2.name) || '/brands/brassivoire.png'}
                    alt={concentrationInsights.top2.name}
                    className="max-h-5 w-auto object-contain"
                  />
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>{concentrationInsights?.top1?.name}</strong> et <strong>{concentrationInsights?.top2?.name}</strong> captent l'essentiel de la demande débitée en maquis.
            </p>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, concentrationInsights?.top2Share || 88)}%` }}
              />
            </div>
          </div>

          {/* Écart de Leader (Delta PDM) */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="font-medium text-foreground text-[11px]">Avance du Leader :</span>
              <span className="font-mono font-bold text-xs text-emerald-400">
                +{concentrationInsights?.deltaTop1Top2 || 0}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Delta de part de marché entre le #1 ({concentrationInsights?.top1?.name}) et le challenger direct ({concentrationInsights?.top2?.name}).
            </p>
          </div>

          {/* Répartition par Fief Territorial */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="size-3 text-amber-500" />
              Fiefs Stratégiques Observés :
            </span>
            <div className="space-y-1">
              {activeBrands.slice(0, 4).map((b) => {
                const color = BRAND_COLORS[b.key] || BRAND_COLORS.default;
                const bLogo = getBrandLogo(b.key || b.name);
                return (
                  <div
                    key={b.id}
                    className="p-1.5 px-2 rounded-lg bg-background/60 border border-border/50 flex items-center justify-between text-[11px] hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {bLogo ? (
                        <div className="size-6 rounded-md bg-white dark:bg-white/95 p-0.5 border border-border/60 flex items-center justify-center shrink-0 shadow-2xs">
                          <img src={bLogo} alt={b.name} className="size-full object-contain" />
                        </div>
                      ) : (
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color.border }} />
                      )}
                      <span className="font-semibold text-foreground truncate">{b.name}</span>
                    </div>
                    <span className="text-muted-foreground text-[10px] font-medium shrink-0 ml-1">
                      {b.fiefTerritorial}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>

        <div className="p-3 border-t border-border/40 bg-muted/10 text-[10px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3 text-emerald-400" />
            Certifié Algorithme E-Maquis
          </span>
          <span>Actualisé en temps réel</span>
        </div>
      </Card>
    </div>
  );
}
