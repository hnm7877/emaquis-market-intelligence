'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Award,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  MapPin,
  Store,
  Package,
  Search,
  RefreshCw,
  X,
  Layers,
  BarChart3,
  DollarSign,
  Flame,
  Sparkles,
  Percent,
} from 'lucide-react';
import { useBrandsQuery } from '@/hooks/market/useMarketQueries';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { formatVolumeValue } from '@/utils/volumeUnit';
import { BrandMarketShareCharts } from '@/components/charts/BrandMarketShareCharts';
import { getBrandLogo } from '@/utils/brandLogos';
import { formatGrowth, growthColorClass, growthBadgeClass } from '@/utils/metrics';

export default function BrandsPage() {
  const { filters, setFilter, resetFilters, volumeUnit } = useMarketFilterStore();
  const [search, setSearch] = useState('');

  // Requête API dynamique vers le backend
  const { data: apiBrandsData, isLoading, refetch, isFetching } = useBrandsQuery();

  const brandsList: any[] = useMemo(() => {
    return apiBrandsData?.brands || [];
  }, [apiBrandsData]);

  // Filtrage par recherche
  const filteredBrands = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return brandsList;
    return brandsList.filter(
      (b) =>
        b.name?.toLowerCase().includes(s) ||
        b.topCategory?.toLowerCase().includes(s) ||
        b.fiefTerritorial?.toLowerCase().includes(s) ||
        b.mainZones?.some((z: string) => z.toLowerCase().includes(s))
    );
  }, [brandsList, search]);

  // KPIs globaux du marché
  const marketMetrics = useMemo(() => {
    const totalVol = brandsList.reduce((acc, b) => acc + (b.volume || 0), 0);
    const totalRev = brandsList.reduce((acc, b) => acc + (b.revenue || 0), 0);
    const leader = brandsList[0] || null;
    const avgPenetration =
      brandsList.length > 0
        ? Math.round(
            brandsList.reduce((acc, b) => acc + (b.penetrationRate || 0), 0) /
              brandsList.filter((b) => b.volume > 0).length || 1
          )
        : 0;

    return { totalVol, totalRev, leader, avgPenetration };
  }, [brandsList]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12" suppressHydrationWarning>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="size-5 text-amber-500 shrink-0" />
              Analyse des Marques &amp; Brasseries
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Calcul des parts...' : `${brandsList.length} Marques analysées`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
            Parts de marché observées, taux de pénétration POS, fiefs territoriaux et dynamique de distribution.
          </p>
        </div>

        {/* Quick Search & Refresh Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:flex-none w-full sm:w-56 md:w-64">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filtrer une marque, zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs w-full pl-8 bg-background/80"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Effacer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5 text-xs gap-1.5 border-border/80"
            title="Rafraîchir les données marques"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* KPI 1: Volume Global */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] sm:text-xs font-medium truncate">Volume Global Débité</span>
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 shrink-0">
                <BarChart3 className="size-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono text-foreground tracking-tight truncate">
              {formatVolumeValue(marketMetrics.totalVol, volumeUnit, marketMetrics.totalRev).formatted}
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Unité : <strong className="text-foreground">{volumeUnit.toUpperCase()}</strong></span>
              <span className="text-emerald-400 font-medium">Flux certifié</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: CA Consolidé */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] sm:text-xs font-medium truncate">Chiffre d'Affaires Global</span>
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
                <DollarSign className="size-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono text-foreground tracking-tight truncate">
              {marketMetrics.totalRev.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Toutes marques confondues</span>
              <span className="text-muted-foreground font-medium">ventes observées</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Leader Marché */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] sm:text-xs font-medium truncate">Leader Part de Marché</span>
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 shrink-0">
                <Flame className="size-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold text-foreground tracking-tight truncate flex items-center gap-2">
              <div className="size-6 rounded-md bg-white p-0.5 border border-border/80 flex items-center justify-center shrink-0 shadow-2xs">
                <img
                  src={getBrandLogo(marketMetrics.leader?.key || marketMetrics.leader?.name) || '/brands/solibra.png'}
                  alt=""
                  className="size-full object-contain"
                />
              </div>
              <span className="truncate">{marketMetrics.leader?.name || 'SOLIBRA'}</span>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] font-mono font-bold px-1.5 py-0">
                {marketMetrics.leader?.marketShare || 0}% PDM
              </Badge>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Fief : <strong className="text-foreground">{marketMetrics.leader?.fiefTerritorial || 'n/d'}</strong>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Taux Moyen Pénétration */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <CardContent className="p-3 sm:p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] sm:text-xs font-medium truncate">Pénétration Débits Active</span>
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 shrink-0">
                <Store className="size-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono text-foreground tracking-tight truncate">
              {marketMetrics.avgPenetration}% <span className="text-xs font-normal text-muted-foreground">taux moyen</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Base : {marketMetrics.leader?.totalPosCount ?? 'n/d'} points de vente</span>
              <span className="text-blue-400 font-medium">Indexé</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques Interactifs & Camemberts des Parts de Marché */}
      <BrandMarketShareCharts brands={brandsList} volumeUnit={volumeUnit} />

      {/* Titre de section pour les Fiches Détaillées */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="size-4 text-amber-500" />
            Fiches Analytiques par Marque
          </h2>
          <Badge variant="outline" className="text-[11px] font-mono">
            {filteredBrands.length} affichée(s)
          </Badge>
        </div>
      </div>

      {/* Brand Cards Grid (Responsive & Rich UX) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredBrands.map((brand: any, idx: number) => {
          const vol = brand.volume || 0;
          const rev = brand.revenue || 0;
          const share = brand.marketShare || 0;
          const growth = brand.growth ?? brand.growthPercent ?? null;
          const pen = brand.penetrationRate || 0;
          const activePos = brand.activePosCount || 0;
          const totalPos = brand.totalPosCount || 0;
          const topCat = brand.topCategory || 'Boissons';
          const fief = brand.fiefTerritorial || brand.strongestZone || 'Non établi';
          const topProds = brand.topProducts || [];
          const rank = idx + 1;

          const isLeader = rank === 1;
          const isChallenger = rank === 2;
          const logoSrc = brand.logo || getBrandLogo(brand.key || brand.name);

          return (
            <Card
              key={brand.id || brand.key || brand.name}
              className={`border transition-all duration-300 backdrop-blur-md relative overflow-hidden flex flex-col justify-between group ${
                isLeader
                  ? 'border-amber-500/50 bg-gradient-to-br from-card via-card/90 to-amber-950/15 shadow-xl shadow-amber-500/10 hover:border-amber-500/70'
                  : isChallenger
                  ? 'border-emerald-500/40 bg-gradient-to-br from-card via-card/90 to-emerald-950/10 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/60'
                  : rank === 3
                  ? 'border-red-500/30 bg-gradient-to-br from-card via-card/90 to-red-950/10 hover:border-red-500/50'
                  : 'border-border/80 bg-card/70 hover:border-primary/40'
              }`}
            >
              {/* Filigrane / Watermark du logo de la marque en arrière-plan */}
              {logoSrc && (
                <div className="absolute -right-3 -bottom-3 opacity-[0.05] dark:opacity-[0.07] pointer-events-none select-none transition-opacity duration-300 group-hover:opacity-[0.10]">
                  <img src={logoSrc} alt="" className="size-28 object-contain filter grayscale" />
                </div>
              )}

              <div>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2.5 relative z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Conteneur Logo de la Marque */}
                    <div className="size-13 sm:size-14 rounded-2xl bg-white dark:bg-white/95 border border-border/80 p-2 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={brand.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="size-full rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-extrabold text-sm">
                          {brand.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`size-5 rounded-full flex items-center justify-center font-bold text-[10px] font-mono border ${
                            isLeader
                              ? 'bg-amber-500 text-black border-amber-400 shadow-xs'
                              : isChallenger
                              ? 'bg-emerald-500 text-black border-emerald-400/80'
                              : rank === 3
                              ? 'bg-red-500 text-white border-red-400/80'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          #{rank}
                        </span>
                        <CardTitle className="text-base font-bold tracking-tight text-foreground truncate">
                          {brand.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-medium border border-border/60">
                          {topCat}
                        </span>
                        {brand.productCount > 0 && (
                          <span>• {brand.productCount} SKU(s)</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Market Share PDM Badge */}
                  <Badge
                    variant={isLeader ? 'default' : 'secondary'}
                    className={`font-mono text-xs font-bold shrink-0 px-2 py-1 ${
                      isLeader
                        ? 'bg-amber-500 text-black shadow-xs shadow-amber-500/30 font-extrabold'
                        : isChallenger
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-muted/80 text-foreground border-border/80'
                    }`}
                  >
                    {share}% PDM
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  {/* Key Metrics Grid */}
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                    {/* Volume */}
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Volume Débité :</span>
                      <span className="font-bold text-foreground font-mono">
                        {formatVolumeValue(vol, volumeUnit, rev).formatted}
                      </span>
                    </div>

                    {/* CA */}
                    {rev > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Chiffre d'Affaires :</span>
                        <span className="font-bold text-foreground font-mono text-[11px]">
                          {rev.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    )}

                    {/* Croissance périodique */}
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Croissance périodique :</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          growthColorClass(growth)
                        }`}
                      >
                        {(growth ?? 0) > 0 && <TrendingUp className="size-3" />}
                        {(growth ?? 0) < 0 && <TrendingDown className="size-3" />}
                        {formatGrowth(growth)}
                      </span>
                    </div>

                    {/* Taux de pénétration POS */}
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Taux de pénétration POS :</span>
                        <span className="font-bold text-foreground font-mono">
                          {pen}%{' '}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            ({activePos}/{totalPos} maquis)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLeader ? 'bg-amber-500' : 'bg-primary'
                          }`}
                          style={{ width: `${pen}%` }}
                        />
                      </div>
                    </div>

                    {/* Fief territorial */}
                    <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3 text-amber-500" />
                        Fief territorial :
                      </span>
                      <span className="font-semibold text-foreground text-right truncate max-w-[170px] sm:max-w-[200px]" title={fief}>
                        {fief}
                      </span>
                    </div>
                  </div>

                  {/* Top 3 Products of the Brand */}
                  {topProds.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Package className="size-3 text-amber-500" />
                        Produits Phares :
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {topProds.map((prod: any, pIdx: number) => (
                          <span
                            key={pIdx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-foreground truncate max-w-full font-medium"
                            title={`${prod.name} (${prod.volume.toLocaleString('fr-FR')} cols)`}
                          >
                            {prod.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/10">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-400" />
                  Flux certifié E-Maquis
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {vol > 0 ? `${activePos} POS actifs` : 'En catalogue'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredBrands.length === 0 && !isLoading && (
        <div className="p-12 text-center border border-border/60 rounded-2xl bg-card/50">
          <Award className="size-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Aucune marque trouvée</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Aucun résultat ne correspond à "{search}". Modifiez vos termes de recherche.
          </p>
          <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-3 text-xs">
            Réinitialiser la recherche
          </Button>
        </div>
      )}
    </div>
  );
}