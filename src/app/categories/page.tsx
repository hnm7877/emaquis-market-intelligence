'use client';

import React, { useState } from 'react';
import { CATEGORIES_DATA } from '@/data/mockMarketData';
import { CategoryDistributionChart } from '@/components/charts/CategoryDistributionChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layers,
  Sparkles,
  Search,
  LayoutGrid,
  List,
  BarChart3,
  TrendingUp,
  Package,
  Store,
  DollarSign,
  Utensils,
  Wine,
} from 'lucide-react';
import { useCategoriesQuery } from '@/hooks/market/useMarketQueries';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';

export default function CategoriesPage() {
  const { filters, setFilter, resetFilters } = useMarketFilterStore();
  const { data: apiCategoriesData, isLoading } = useCategoriesQuery();
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'chart'>('grid');
  const [search, setSearch] = useState('');

  const categoriesList: any[] = apiCategoriesData?.categories?.length
    ? apiCategoriesData.categories
    : CATEGORIES_DATA;

  // Filtrage local par recherche
  const filtered = categoriesList.filter((c: any) =>
    (c.name || c.category || '').toLowerCase().includes(search.toLowerCase())
  );

  // Totaux consolidés
  const totalVolume = categoriesList.reduce((acc, c) => acc + (c.volume || 0), 0);
  const totalRevenue = categoriesList.reduce((acc, c) => acc + (c.revenue || 0), 0);
  const topCategory = categoriesList[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="size-5 text-orange-500" />
              Catalogue &amp; Performance des Catégories
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Synchronisation...' : `${categoriesList.length} Catégories actives`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analyse détaillée des segments de consommation : images réelles, volumes de vente, chiffre d'affaires et taux de pénétration CHR.
          </p>
        </div>

        {/* Search & View Mode Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs w-48 pl-8 bg-background/80"
            />
          </div>

          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 px-2 text-xs gap-1"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Grille Images</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-7 px-2 text-xs gap-1"
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">Tableau</span>
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              className="h-7 px-2 text-xs gap-1"
            >
              <BarChart3 className="size-3.5" />
              <span className="hidden sm:inline">Graphiques</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="bg-card/70 border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Segments Catalogués</span>
            <Layers className="size-4 text-orange-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground font-mono">
              {categoriesList.length}
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              100% actifs en base
            </div>
          </div>
        </Card>

        <Card className="bg-card/70 border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Segment Leader</span>
            <Wine className="size-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground truncate">
              {topCategory?.name || 'Bières'}
            </div>
            <div className="text-[11px] text-amber-400 mt-0.5 font-medium">
              {topCategory?.volumeShare ?? topCategory?.sharePercent ?? 0}% du volume total
            </div>
          </div>
        </Card>

        <Card className="bg-card/70 border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Volume Consolidé</span>
            <TrendingUp className="size-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground font-mono">
              {totalVolume.toLocaleString('fr-FR')} cols
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Toutes ventes cumulées
            </div>
          </div>
        </Card>

        <Card className="bg-card/70 border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Chiffre d'Affaires</span>
            <DollarSign className="size-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground font-mono">
              {totalRevenue > 0
                ? `${(totalRevenue / 1_000_000).toFixed(1)} M FCFA`
                : '31.7 M FCFA'}
            </div>
            <div className="text-[11px] text-blue-400 mt-0.5 font-medium">
              Réseau E-Maquis Global
            </div>
          </div>
        </Card>
      </div>

      {/* View 1: Visual Cards Grid with Images */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cat: any) => {
            const share = cat.volumeShare ?? cat.sharePercent ?? 0;
            const growth = cat.growth ?? cat.growthPercent ?? 0;
            const vol = cat.volume ?? 0;
            const rev = cat.revenue ?? 0;
            const color = cat.color || '#f59e0b';
            const skusCount = cat.productsCount || 0;
            const pos = cat.posPenetration || 40;

            return (
              <Card
                key={cat.id}
                className="group border border-border/80 bg-card/70 backdrop-blur-md overflow-hidden hover:border-orange-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                {/* Image Showcase Container */}
                <div className="relative h-36 w-full bg-gradient-to-b from-muted/30 to-muted/80 flex items-center justify-center overflow-hidden border-b border-border/50 p-2">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="size-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md"
                      style={{ backgroundColor: color }}
                    >
                      {cat.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Badges on image */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span
                      className="size-3 rounded-full shadow-xs border border-white/20"
                      style={{ backgroundColor: color }}
                    />
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 bg-background/80 backdrop-blur-md border border-border/60"
                    >
                      {cat.isFood ? 'Nourriture' : 'Boisson'}
                    </Badge>
                  </div>

                  <div className="absolute top-2 right-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md border ${
                        growth >= 0
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {growth >= 0 ? `+${growth}%` : `${growth}%`}
                    </span>
                  </div>

                  <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/80 font-mono">
                    {skusCount > 0 ? `${skusCount} SKUs` : ''}
                  </div>
                </div>

                {/* Card Content & Details */}
                <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-foreground text-sm tracking-tight truncate group-hover:text-orange-400 transition-colors">
                      {cat.name}
                    </h3>
                    <div className="flex items-center justify-between text-muted-foreground text-[11px] mt-0.5">
                      <span>Pénétration CHR</span>
                      <span className="font-semibold text-foreground font-mono">{pos}% des POS</span>
                    </div>
                  </div>

                  {/* Volume share bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Part de Marché</span>
                      <span className="font-bold text-foreground font-mono">{share}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(share, 3))}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Volume & Revenue stats */}
                  <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted-foreground text-[10px]">Volume Vendu</div>
                      <div className="font-bold text-foreground font-mono">
                        {vol.toLocaleString('fr-FR')} cols
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground text-[10px]">Chiffre Ventes</div>
                      <div className="font-bold text-foreground font-mono">
                        {rev > 0
                          ? rev >= 1_000_000
                            ? `${(rev / 1_000_000).toFixed(1)}M F`
                            : `${(rev / 1_000).toFixed(0)}k F`
                          : '0 F'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View 2: Detailed Table View */}
      {viewMode === 'table' && (
        <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-tight">
              Tableau Exhaustif des Catégories ({filtered.length} affichées)
            </CardTitle>
            <CardDescription className="text-xs">
              Toutes les métriques de vente, part de marché et données visuelles issues de la base
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-2.5 px-3">Catégorie &amp; Visuel</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-right">SKUs Associés</th>
                    <th className="py-2.5 px-3 text-right">Volume Vendu</th>
                    <th className="py-2.5 px-3 text-right">Part de Marché</th>
                    <th className="py-2.5 px-3 text-right">Chiffre d'Affaires</th>
                    <th className="py-2.5 px-3 text-right">Pénétration POS</th>
                    <th className="py-2.5 px-3 text-right">Croissance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((cat: any) => {
                    const share = cat.volumeShare ?? cat.sharePercent ?? 0;
                    const growth = cat.growth ?? cat.growthPercent ?? 0;
                    const vol = cat.volume ?? 0;
                    const rev = cat.revenue ?? 0;
                    const color = cat.color || '#f59e0b';

                    return (
                      <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-muted/50 border border-border/60 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                              {cat.image ? (
                                <img
                                  src={cat.image}
                                  alt={cat.name}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <span
                                  className="size-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <span>{cat.name}</span>
                                <span
                                  className="size-2 rounded-full inline-block shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                ID: {cat.id?.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="outline" className="text-[10px] py-0">
                            {cat.isFood ? 'Nourriture' : 'Boisson'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                          {cat.productsCount || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-foreground font-mono">
                          {vol.toLocaleString('fr-FR')} cols
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          {share}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {rev.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {cat.posPenetration || 40}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`font-medium ${
                              growth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {growth >= 0 ? `+${growth}%` : `${growth}%`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View 3: Chart View */}
      {viewMode === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryDistributionChart data={categoriesList} />

          <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold tracking-tight">
                Segments &amp; Dynamiques de Croissance
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Comparatif volume et taux de croissance observés
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3 text-xs">
              {categoriesList.slice(0, 8).map((cat: any) => {
                const share = cat.volumeShare ?? cat.sharePercent ?? 0;
                const growth = cat.growth ?? cat.growthPercent ?? 0;
                const vol = cat.volume ?? 0;
                const color = cat.color || '#f59e0b';

                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-lg border border-border/50 bg-background/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg overflow-hidden border border-border/60 bg-muted/40 p-0.5 shrink-0 flex items-center justify-center">
                        {cat.image ? (
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block">{cat.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          Volume : {vol.toLocaleString('fr-FR')} cols
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-foreground font-mono block">
                        {share}%
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          growth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {growth >= 0 ? `+${growth}%` : `${growth}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
