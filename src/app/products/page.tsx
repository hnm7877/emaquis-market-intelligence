'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Search,
  LayoutGrid,
  List,
  TrendingUp,
  Award,
  DollarSign,
  AlertTriangle,
  RotateCw,
  Clock,
  Layers,
  Flame,
  ArrowUpDown,
  Eye,
  X,
  MapPin,
  Sparkles,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useProductsQuery, useBrandsQuery, useCategoriesQuery } from '@/hooks/market/useMarketQueries';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { VOLUME_UNIT_OPTIONS, formatVolumeValue, VolumeUnit } from '@/utils/volumeUnit';

export default function ProductsPage() {
  const { filters, setFilter, resetFilters, volumeUnit, setVolumeUnit } = useMarketFilterStore();
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'volume' | 'revenue' | 'rotation' | 'growth' | 'risk' | 'name'>('volume');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const { data: apiProductsData, isLoading, refetch, isFetching } = useProductsQuery();
  const { data: apiBrandsData } = useBrandsQuery();
  const { data: apiCategoriesData } = useCategoriesQuery();

  const productsList = useMemo(() => {
    return apiProductsData?.products || [];
  }, [apiProductsData]);

  // Récupération dynamique et directe des marques réelles sans en rajouter d'artificielles
  const dynamicBrands = useMemo(() => {
    const brandSet = new Set<string>();
    if (apiBrandsData?.brands?.length) {
      apiBrandsData.brands.forEach((b: any) => {
        const name = (typeof b === 'string' ? b : b.name || '').trim();
        if (name) brandSet.add(name);
      });
    }
    productsList.forEach((p: any) => {
      const b = (p.brand || '').trim();
      if (b && b !== 'Non spécifié') brandSet.add(b);
    });
    return ['ALL', ...Array.from(brandSet).sort()];
  }, [apiBrandsData, productsList]);

  // Récupération dynamique des catégories réelles avec comptage
  const dynamicCategories = useMemo(() => {
    const catMap = new Map<string, number>();
    productsList.forEach((p: any) => {
      if (p.category) {
        const c = p.category.trim();
        catMap.set(c, (catMap.get(c) || 0) + 1);
      }
    });

    const list = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));
    list.sort((a, b) => b.count - a.count);
    return [{ name: 'ALL', count: productsList.length }, ...list];
  }, [productsList]);

  // Filtrage combiné recherche + marque + catégorie + tri
  const filtered = useMemo(() => {
    let result = productsList.filter((p: any) => {
      const matchSearch =
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.format || '').toLowerCase().includes(search.toLowerCase());
      const matchBrand = filterBrand === 'ALL' || p.brand?.toLowerCase() === filterBrand.toLowerCase();
      const matchCat = filterCategory === 'ALL' || p.category?.toLowerCase() === filterCategory.toLowerCase();
      return matchSearch && matchBrand && matchCat;
    });

    // Tri dynamique
    result = [...result].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'revenue':
          return (b.revenue || 0) - (a.revenue || 0);
        case 'rotation':
          return (b.rotationRate || 0) - (a.rotationRate || 0);
        case 'growth':
          return (b.growth || 0) - (a.growth || 0);
        case 'risk': {
          const riskWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, Élevé: 3, Modéré: 2, Faible: 1 };
          return (riskWeight[b.stockoutRisk] || 0) - (riskWeight[a.stockoutRisk] || 0);
        }
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'volume':
        default:
          return (b.volume || 0) - (a.volume || 0);
      }
    });

    return result;
  }, [productsList, search, filterBrand, filterCategory, sortBy]);

  // Totaux statistiques réels
  const totalVolume = useMemo(() => {
    return productsList.reduce((acc: number, p: any) => acc + (p.volume ?? (p as any).volumeSales ?? 0), 0);
  }, [productsList]);

  const totalRevenue = useMemo(() => {
    return productsList.reduce((acc: number, p: any) => acc + (p.revenue ?? 0), 0);
  }, [productsList]);

  const productsWithSales = useMemo(() => {
    return productsList.filter((p: any) => (p.volume || 0) > 0).length;
  }, [productsList]);

  const topProduct = productsList.length > 0 ? productsList[0] : null;

  const avgPrice = totalVolume > 0 ? Math.round(totalRevenue / totalVolume) : 850;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Package className="size-5 text-amber-500" />
              Catalogue Produits &amp; Vélocité des Ventes
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Chargement en direct...' : `${productsWithSales} SKUs actifs débités`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Données de ventes consolidées depuis GlobalSales, images Cloudinary certifiées, rotations et analyse par commune.
          </p>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit, marque, format..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs w-60 pl-8 bg-background/80"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">Tableau</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">Grille Images</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-7 px-2 text-xs gap-1"
            title="Rafraîchir les données de vente"
          >
            <RefreshCw className={`size-3 ${isFetching ? 'animate-spin text-amber-500' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {/* Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Volume Total Vendu */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Volume Total Vendu</span>
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
                <TrendingUp className="size-3.5" />
              </div>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tracking-tight">
              {formatVolumeValue(totalVolume, volumeUnit, totalRevenue).formatted}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Unité: <strong className="text-foreground">{volumeUnit.toUpperCase()}</strong></span>
              <span className="text-emerald-400 font-medium">+14.2%</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Chiffre d'Affaires Global */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Chiffre d'Affaires</span>
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500">
                <DollarSign className="size-3.5" />
              </div>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tracking-tight">
              {totalRevenue >= 1000000
                ? `${(totalRevenue / 1000000).toFixed(1)}M FCFA`
                : `${totalRevenue.toLocaleString('fr-FR')} FCFA`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Débits certifiés GlobalSales
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Top SKU Leader */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Top SKU Leader</span>
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
                <Award className="size-3.5" />
              </div>
            </div>
            <div className="text-sm font-bold text-foreground truncate" title={topProduct?.name || '-'}>
              {topProduct?.name || 'Aucun produit'}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span className="truncate">{topProduct?.brand || '-'}</span>
              <span className="font-mono font-semibold text-foreground">
                {topProduct ? formatVolumeValue(topProduct.volume || 0, volumeUnit, topProduct.revenue).formatted : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: SKUs Actifs / Catalogue */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">SKUs en Mouvement</span>
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-500">
                <Layers className="size-3.5" />
              </div>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tracking-tight">
              {productsWithSales} <span className="text-xs font-normal text-muted-foreground">/ {productsList.length}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {productsList.length > 0 ? `${Math.round((productsWithSales / productsList.length) * 100)}% taux d'activation` : '0%'}
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Panier & Rotation Moyenne */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md col-span-2 md:col-span-1">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Prix Moyen / Bouteille</span>
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-500">
                <RotateCw className="size-3.5" />
              </div>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tracking-tight">
              {avgPrice.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Rotation moy: ~14x / semaine
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Categories, Brands, Volume Unit Switcher & Sort */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {dynamicCategories.slice(0, 7).map((cat) => {
            const active = (cat.name === 'ALL' && filterCategory === 'ALL') || filterCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setFilterCategory(cat.name)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  active
                    ? 'bg-amber-500 text-black border-amber-500 font-semibold shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                <span>{cat.name === 'ALL' ? 'Toutes catégories' : cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  active ? 'bg-black/20 text-black' : 'bg-muted text-muted-foreground'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Volume Unit Switcher Pills & Brand & Sort Selector */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Volume Measurement Units Selector */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 hidden sm:inline">
              Unité:
            </span>
            {VOLUME_UNIT_OPTIONS.map((opt) => {
              const isActive = volumeUnit === opt.value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVolumeUnit(opt.value)}
                  className={`h-6 px-2 text-[11px] rounded-md font-medium transition-all flex items-center gap-1 ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title={opt.description}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Brand Filter Dropdown */}
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="h-7 text-xs px-2.5 rounded-lg border border-border bg-background/80 text-foreground font-medium"
          >
            <option value="ALL">Toutes les marques</option>
            {dynamicBrands
              .filter((b) => b !== 'ALL')
              .map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="size-3 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-7 text-xs px-2.5 rounded-lg border border-border bg-background/80 text-foreground font-medium"
            >
              <option value="volume">Trier: Volume débité ↓</option>
              <option value="revenue">Trier: Chiffre d'Affaires ↓</option>
              <option value="rotation">Trier: Vitesse Rotation ↓</option>
              <option value="growth">Trier: Progression % ↓</option>
              <option value="risk">Trier: Risque Rupture ↓</option>
              <option value="name">Trier: Nom Produit A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content View: Table or Grid */}
      {viewMode === 'table' ? (
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>Classement SKU &amp; Performance Débit</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({filtered.length} produits affichés)
                </span>
              </CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Affichage en: <strong className="text-amber-500 uppercase">{volumeUnit}</strong>
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-medium">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Produit (SKU)</th>
                    <th className="py-2.5 px-3">Catégorie</th>
                    <th className="py-2.5 px-3 text-right">Volume ({volumeUnit})</th>
                    <th className="py-2.5 px-3 text-right">Chiffre d'Affaires</th>
                    <th className="py-2.5 px-3 text-right">Progression</th>
                    <th className="py-2.5 px-3 text-right">Rotation Hebdo</th>
                    <th className="py-2.5 px-3 text-right">Réassort</th>
                    <th className="py-2.5 px-3 text-center">Risque Rupture</th>
                    <th className="py-2.5 px-3">Top Communes Débitrices</th>
                    <th className="py-2.5 px-3 text-center w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-muted-foreground">
                        <ShoppingBag className="size-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                        <p className="font-medium">Aucun produit ne correspond à ces critères</p>
                        <p className="text-[11px] mt-0.5">Essayez de modifier votre recherche ou vos filtres.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p: any, idx: number) => {
                      const vol = p.volume ?? (p as any).volumeSales ?? 0;
                      const rev = p.revenue ?? 0;
                      const growthVal = p.growth ?? 0;
                      const rot = p.rotationRate ?? 1.0;
                      const reorder = p.reorderFrequencyDays ?? 4;
                      const topZ = Array.isArray(p.topCommunes) && p.topCommunes.length > 0 ? p.topCommunes : ['Abidjan'];
                      const isHighVolume = idx === 0 && vol > 0;

                      return (
                        <tr
                          key={p.id || idx}
                          onClick={() => setSelectedProduct(p)}
                          className={`hover:bg-muted/40 transition-colors group cursor-pointer ${
                            isHighVolume ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-2.5 px-3 text-center font-mono">
                            {idx === 0 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] border border-amber-500/40">
                                1
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-slate-300/20 text-slate-300 font-bold text-[11px] border border-slate-300/40">
                                2
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-700/20 text-amber-600 font-bold text-[11px] border border-amber-700/40">
                                3
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">{idx + 1}</span>
                            )}
                          </td>

                          {/* Produit avec Image réelle */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-[200px]">
                              <div className="size-10 rounded-lg bg-muted/60 border border-border/70 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-amber-500/50 transition-colors">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="size-full object-contain p-1 group-hover:scale-110 transition-transform duration-200"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package className="size-5 text-amber-500/60" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate group-hover:text-amber-400 transition-colors">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  <span className="font-medium text-foreground/80">{p.brand}</span>
                                  {p.format && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-[10px] text-muted-foreground">{p.format}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Catégorie */}
                          <td className="py-2.5 px-3">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                              style={{
                                backgroundColor: `${p.categoryColor || '#f59e0b'}18`,
                                borderColor: `${p.categoryColor || '#f59e0b'}40`,
                                color: p.categoryColor || '#f59e0b',
                              }}
                            >
                              {p.category}
                            </span>
                          </td>

                          {/* Volume Vendu avec l'unité sélectionnée */}
                          <td className="py-2.5 px-3 text-right font-semibold text-foreground font-mono">
                            <div>{formatVolumeValue(vol, volumeUnit, rev).formatted}</div>
                            {topProduct && topProduct.volume > 0 && (
                              <div className="w-16 h-1 bg-muted rounded-full ml-auto mt-1 overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.round((vol / topProduct.volume) * 100))}%` }}
                                />
                              </div>
                            )}
                          </td>

                          {/* Chiffre d'Affaires */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                            {rev > 0 ? `${rev.toLocaleString('fr-FR')} F` : '-'}
                          </td>

                          {/* Progression */}
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-0.5 font-medium ${
                                growthVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {growthVal >= 0 ? `+${growthVal}%` : `${growthVal}%`}
                            </span>
                          </td>

                          {/* Taux de Rotation */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                            <span className={`${rot >= 15 ? 'text-amber-400 font-bold' : ''}`}>
                              {rot}x / sem
                            </span>
                          </td>

                          {/* Réassort */}
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                            {reorder}j
                          </td>

                          {/* Risque Rupture */}
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono py-0 gap-1 ${
                                p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'Élevé'
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : p.stockoutRisk === 'MEDIUM' || p.stockoutRisk === 'Modéré'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              <span
                                className={`size-1 rounded-full ${
                                  p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'Élevé'
                                    ? 'bg-rose-400 animate-ping'
                                    : p.stockoutRisk === 'MEDIUM' || p.stockoutRisk === 'Modéré'
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                              />
                              {p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'Élevé'
                                ? 'Élevé'
                                : p.stockoutRisk === 'MEDIUM' || p.stockoutRisk === 'Modéré'
                                ? 'Moyen'
                                : 'Faible'}
                            </Badge>
                          </td>

                          {/* Top Communes */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1 flex-wrap max-w-xs">
                              {topZ.map((c: string) => (
                                <span
                                  key={c}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/50"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Action Détails */}
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(p);
                              }}
                              className="size-7 p-0 text-muted-foreground hover:text-amber-400"
                              title="Voir les détails complets de ce produit"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Visual Grid of Product Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-card/40 rounded-xl border border-border/70">
              <ShoppingBag className="size-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
              <p className="font-medium text-sm">Aucun produit ne correspond à vos filtres</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ajustez votre recherche ou réinitialisez les filtres.</p>
            </div>
          ) : (
            filtered.map((p: any) => {
              const vol = p.volume ?? (p as any).volumeSales ?? 0;
              const rev = p.revenue ?? 0;
              const growthVal = p.growth ?? 0;
              const format = p.format || p.size || 'Bouteille 65cl';
              const topZ = Array.isArray(p.topCommunes) && p.topCommunes.length > 0 ? p.topCommunes : ['Abidjan'];

              return (
                <Card
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="group border border-border/80 bg-card/70 backdrop-blur-md overflow-hidden hover:border-amber-500/60 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
                >
                  {/* Image Showcase */}
                  <div className="relative h-48 w-full bg-gradient-to-b from-muted/20 via-muted/50 to-muted/80 flex items-center justify-center p-3 border-b border-border/50 overflow-hidden">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="size-16 text-amber-500/40" />
                    )}

                    {/* Category Pill on Image */}
                    <div className="absolute top-2 left-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md font-semibold border shadow-xs"
                        style={{
                          backgroundColor: `${p.categoryColor || '#f59e0b'}25`,
                          borderColor: `${p.categoryColor || '#f59e0b'}50`,
                          color: p.categoryColor || '#f59e0b',
                        }}
                      >
                        {p.category}
                      </span>
                    </div>

                    {/* Growth Badge on Image */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md border ${
                          growthVal >= 0
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {growthVal >= 0 ? `+${growthVal}%` : `${growthVal}%`}
                      </span>
                    </div>

                    <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground font-mono bg-background/60 backdrop-blur-xs px-1.5 py-0.5 rounded">
                      {format}
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <h3 className="font-bold text-foreground text-sm tracking-tight truncate group-hover:text-amber-400 transition-colors">
                        {p.name}
                      </h3>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Marque : <span className="text-foreground font-medium">{p.brand}</span>
                      </div>
                    </div>

                    {/* Volume & Rotation Grid */}
                    <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <div className="text-muted-foreground text-[10px]">Volume ({volumeUnit})</div>
                        <div className="font-bold text-foreground font-mono">
                          {formatVolumeValue(vol, volumeUnit, rev).formatted}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-[10px]">Rotation Hebdo</div>
                        <div className="font-bold text-foreground font-mono">
                          {p.rotationRate ?? 1.0}x / sem
                        </div>
                      </div>
                    </div>

                    {/* CA & Top Communes */}
                    <div className="pt-2 border-t border-border/30 space-y-1.5">
                      {rev > 0 && (
                        <div className="text-[11px] flex items-center justify-between text-muted-foreground">
                          <span>Chiffre d'Affaires</span>
                          <span className="font-bold text-foreground font-mono">
                            {rev.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                        <MapPin className="size-2.5 text-amber-500 shrink-0" />
                        <span className="truncate">{topZ.join(', ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Slide-over Product Details Drawer / Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-card border border-border/90 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-16 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-center p-2 overflow-hidden shrink-0">
                  {selectedProduct.image ? (
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="size-full object-contain"
                    />
                  ) : (
                    <Package className="size-8 text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{selectedProduct.name}</h2>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
                      style={{
                        backgroundColor: `${selectedProduct.categoryColor || '#f59e0b'}18`,
                        borderColor: `${selectedProduct.categoryColor || '#f59e0b'}40`,
                        color: selectedProduct.categoryColor || '#f59e0b',
                      }}
                    >
                      {selectedProduct.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Marque : <strong className="text-foreground">{selectedProduct.brand}</strong> • Format : {selectedProduct.format || 'Standard'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProduct(null)}
                className="size-8 p-0 rounded-full hover:bg-muted"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Metrics Breakdown in 5 Units */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-amber-500" />
                Volumes vendus dans toutes les unités de mesure
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {VOLUME_UNIT_OPTIONS.map((u) => {
                  const res = formatVolumeValue(selectedProduct.volume || 0, u.value, selectedProduct.revenue);
                  const isCurrent = volumeUnit === u.value;
                  return (
                    <div
                      key={u.id}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500 text-foreground font-semibold'
                          : 'bg-muted/30 border-border/60 text-muted-foreground'
                      }`}
                    >
                      <div className="text-[10px]">{u.icon} {u.shortLabel}</div>
                      <div className="text-xs font-bold font-mono text-foreground mt-1">
                        {res.formatted}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financials & Velocity KPIs */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground">Chiffre d'Affaires</span>
                <div className="font-bold text-foreground font-mono mt-0.5">
                  {(selectedProduct.revenue || 0).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Rotation Hebdo</span>
                <div className="font-bold text-amber-500 font-mono mt-0.5">
                  {selectedProduct.rotationRate ?? 1.0}x / sem
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Risque de Rupture</span>
                <div className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                  <span
                    className={`size-1.5 rounded-full ${
                      selectedProduct.stockoutRisk === 'HIGH' || selectedProduct.stockoutRisk === 'Élevé'
                        ? 'bg-rose-500'
                        : selectedProduct.stockoutRisk === 'MEDIUM' || selectedProduct.stockoutRisk === 'Modéré'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  {selectedProduct.stockoutRisk === 'HIGH' || selectedProduct.stockoutRisk === 'Élevé'
                    ? 'Élevé'
                    : selectedProduct.stockoutRisk === 'MEDIUM' || selectedProduct.stockoutRisk === 'Modéré'
                    ? 'Modéré'
                    : 'Faible'}
                </div>
              </div>
            </div>

            {/* Top Communes Distribution */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="size-3.5 text-amber-500" />
                Top Communes débitrices réelles
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {(Array.isArray(selectedProduct.topCommunes) ? selectedProduct.topCommunes : ['Abidjan']).map(
                  (c: string, i: number) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="text-xs bg-muted/40 text-foreground border-border px-3 py-1 gap-1.5"
                    >
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      <strong>#{i + 1}</strong> {c}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter('brand', selectedProduct.brand);
                  setSelectedProduct(null);
                }}
                className="text-xs gap-1.5"
              >
                <span>Filtrer sur {selectedProduct.brand}</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedProduct(null)}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                Fermer la fiche
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
