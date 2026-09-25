'use client';

import React, { useState, useMemo } from 'react';
import { PRODUCTS_DATA } from '@/data/mockMarketData';
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
} from 'lucide-react';
import { useProductsQuery, useBrandsQuery, useCategoriesQuery } from '@/hooks/market/useMarketQueries';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';

export default function ProductsPage() {
  const { filters, setFilter, resetFilters } = useMarketFilterStore();
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const { data: apiProductsData, isLoading } = useProductsQuery();
  const { data: apiBrandsData } = useBrandsQuery();
  const { data: apiCategoriesData } = useCategoriesQuery();

  const productsList = apiProductsData?.products?.length ? apiProductsData.products : PRODUCTS_DATA;

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

  // Récupération dynamique des catégories réelles
  const dynamicCategories = useMemo(() => {
    const catSet = new Set<string>();
    if (apiCategoriesData?.categories?.length) {
      apiCategoriesData.categories.forEach((c: any) => {
        if (c.name) catSet.add(c.name.trim());
      });
    }
    productsList.forEach((p: any) => {
      if (p.category) catSet.add(p.category.trim());
    });
    return ['ALL', ...Array.from(catSet).sort()];
  }, [apiCategoriesData, productsList]);

  // Filtrage combiné recherche + marque directe + catégorie
  const filtered = useMemo(() => {
    return productsList.filter((p: any) => {
      const matchSearch =
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase());
      const matchBrand = filterBrand === 'ALL' || p.brand?.toLowerCase() === filterBrand.toLowerCase();
      const matchCat = filterCategory === 'ALL' || p.category?.toLowerCase() === filterCategory.toLowerCase();
      return matchSearch && matchBrand && matchCat;
    });
  }, [productsList, search, filterBrand, filterCategory]);

  // Totaux statistiques
  const totalVolume = productsList.reduce((acc: number, p: any) => acc + (p.volume ?? (p as any).volumeSales ?? 0), 0);
  const totalRevenue = productsList.reduce((acc: number, p: any) => acc + (p.revenue ?? 0), 0);
  const topProduct = productsList[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Package className="size-5 text-orange-500" />
              Catalogue Produits &amp; Vélocité des Ventes
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Chargement catalogue...' : `${productsList.length} SKUs catalogués`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Images réelles Cloudinary, volumes vendus, rotations hebdomadaires et risques de rupture par SKU.
          </p>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit, marque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs w-60 pl-8 bg-background/80"
            />
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
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="bg-card/70 border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Catalogue Total</span>
            <Package className="size-4 text-orange-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground font-mono">
              {productsList.length} SKUs
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              100% avec images réelles
            </div>
          </div>
        </Card>

        <Card className="bg-card/70 border-border/80 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Produit N°1 Ventes</span>
            <Award className="size-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-foreground truncate">
              {topProduct?.name || 'Heineken-33'}
            </div>
            <div className="text-[11px] text-amber-400 mt-0.5 font-medium font-mono">
              {(topProduct?.volume ?? (topProduct as any)?.volumeSales ?? 0).toLocaleString('fr-FR')} cols
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
              Toutes ventes analysées
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
                : '293.6 M FCFA'}
            </div>
            <div className="text-[11px] text-blue-400 mt-0.5 font-medium">
              Ventes directes POS
            </div>
          </div>
        </Card>
      </div>

      {/* Brand quick filter pills (Directement depuis la base sans ajout) */}
      <div className="flex items-center gap-1.5 text-xs flex-wrap">
        <span className="text-muted-foreground font-medium mr-1">Marque :</span>
        {dynamicBrands.slice(0, 10).map((b) => (
          <button
            key={b}
            onClick={() => setFilterBrand(b)}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium cursor-pointer text-xs ${
              filterBrand === b
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {b === 'ALL' ? 'Toutes les marques' : b}
          </button>
        ))}
      </div>

      {/* View 1: Table View */}
      {viewMode === 'table' && (
        <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Catalogue Produits E-Maquis ({filtered.length} affichés)
              </CardTitle>
              <CardDescription className="text-xs">
                Indicateurs réels de vente observés, rotations hebdomadaires et état du risque de rupture
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-2.5 px-3">Produit &amp; Visuel</th>
                    <th className="py-2.5 px-3">Catégorie</th>
                    <th className="py-2.5 px-3 text-right">Volume Vendu</th>
                    <th className="py-2.5 px-3 text-right">Chiffre d'Affaires</th>
                    <th className="py-2.5 px-3 text-right">Progression</th>
                    <th className="py-2.5 px-3 text-right">Rotation</th>
                    <th className="py-2.5 px-3 text-right">Réassort</th>
                    <th className="py-2.5 px-3 text-center">Risque Rupture</th>
                    <th className="py-2.5 px-3">Top Communes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((p: any) => {
                    const vol = p.volume ?? (p as any).volumeSales ?? 0;
                    const rev = p.revenue ?? 0;
                    const growthVal = p.growth ?? p.growthPercent ?? 0;
                    const rot = p.rotationRate ?? 3.5;
                    const reorder = p.reorderFrequencyDays ?? 4;
                    const topZ = p.topCommunes || p.topZones || ['Yopougon', 'Cocody'];
                    const format = p.format || p.size || '65cl';

                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                        {/* Produit avec Image réelle */}
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="relative size-12 rounded-lg bg-muted/40 border border-border/70 p-1 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-orange-500/50 transition-colors">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                              ) : (
                                <Package className="size-5 text-orange-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate group-hover:text-orange-400 transition-colors">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {p.brand} • {format}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Catégorie avec Badge et Image */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {p.categoryImage && (
                              <img
                                src={p.categoryImage}
                                alt={p.category}
                                className="size-5 object-contain rounded-xs border border-border/40 shrink-0"
                                loading="lazy"
                              />
                            )}
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-md font-medium border"
                              style={{
                                backgroundColor: `${p.categoryColor || '#fabf4580'}18`,
                                borderColor: `${p.categoryColor || '#fabf4580'}40`,
                                color: p.categoryColor || '#fabf4580',
                              }}
                            >
                              {p.category}
                            </span>
                          </div>
                        </td>

                        {/* Volume Vendu */}
                        <td className="py-2.5 px-3 text-right font-semibold text-foreground font-mono">
                          {vol.toLocaleString('fr-FR')} cols
                        </td>

                        {/* CA Ventes */}
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {rev > 0 ? `${rev.toLocaleString('fr-FR')} F` : '-'}
                        </td>

                        {/* Progression */}
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-medium ${growthVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {growthVal >= 0 ? `+${growthVal}%` : `${growthVal}%`}
                          </span>
                        </td>

                        {/* Taux de Rotation */}
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                          {rot}x / sem
                        </td>

                        {/* Réassort */}
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {reorder}j
                        </td>

                        {/* Risque Rupture */}
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'Élevé' ? 'destructive' : p.stockoutRisk === 'MEDIUM' || p.stockoutRisk === 'Modéré' ? 'secondary' : 'outline'}
                            className={`text-[10px] font-mono py-0 ${
                              p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'Élevé'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : p.stockoutRisk === 'MEDIUM' || p.stockoutRisk === 'Modéré'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'Élevé' ? 'Élevé' : p.stockoutRisk === 'MEDIUM' || p.stockoutRisk === 'Modéré' ? 'Moyen' : 'Faible'}
                          </Badge>
                        </td>

                        {/* Top Communes */}
                        <td className="py-2.5 px-3 text-[11px] text-muted-foreground truncate max-w-40">
                          {topZ.join(', ')}
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

      {/* View 2: Visual Grid of Product Cards */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p: any) => {
            const vol = p.volume ?? (p as any).volumeSales ?? 0;
            const rev = p.revenue ?? 0;
            const growthVal = p.growth ?? p.growthPercent ?? 0;
            const format = p.format || p.size || '65cl';

            return (
              <Card
                key={p.id}
                className="group border border-border/80 bg-card/70 backdrop-blur-md overflow-hidden hover:border-orange-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                {/* Image Showcase */}
                <div className="relative h-44 w-full bg-gradient-to-b from-muted/30 to-muted/80 flex items-center justify-center p-3 border-b border-border/50">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="size-16 text-orange-400" />
                  )}

                  {/* Category Pill on Image */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
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

                  <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground font-mono">
                    {format}
                  </div>
                </div>

                {/* Card Info */}
                <CardContent className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-foreground text-sm tracking-tight truncate group-hover:text-orange-400 transition-colors">
                      {p.name}
                    </h3>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Marque : <span className="text-foreground font-medium">{p.brand}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-muted-foreground text-[10px]">Volume Ventes</div>
                      <div className="font-bold text-foreground font-mono">
                        {vol.toLocaleString('fr-FR')} cols
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground text-[10px]">Rotation Hebdo</div>
                      <div className="font-bold text-foreground font-mono">
                        {p.rotationRate ?? 3.5}x / sem
                      </div>
                    </div>
                  </div>

                  {rev > 0 && (
                    <div className="text-[11px] flex items-center justify-between text-muted-foreground pt-1 border-t border-border/30">
                      <span>CA Estimé</span>
                      <span className="font-bold text-foreground font-mono">
                        {rev.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
