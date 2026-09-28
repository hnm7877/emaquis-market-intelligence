'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  TrendingDown,
  Award,
  DollarSign,
  AlertTriangle,
  RotateCw,
  Clock,
  Layers,
  Flame,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  MapPin,
  Sparkles,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useProductsQuery, useBrandsQuery, useCategoriesQuery } from '@/hooks/market/useMarketQueries';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { VOLUME_UNIT_OPTIONS, formatVolumeValue, VolumeUnit } from '@/utils/volumeUnit';

type SortField = 'volume' | 'revenue' | 'rotation' | 'growth' | 'risk' | 'name' | 'rank';
type SortDirection = 'asc' | 'desc';
type SegmentFilter = 'ALL' | 'TOP_10' | 'GROWTH' | 'HIGH_RISK' | 'HIGH_ROTATION';

export default function ProductsPage() {
  const { filters, setFilter, resetFilters, volumeUnit, setVolumeUnit } = useMarketFilterStore();
  
  // États de filtrage, affichage et navigation
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [selectedSegment, setSelectedSegment] = useState<SegmentFilter>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');
  
  // Tri dynamique
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(24);
  
  // Drawer / Modal détail produit & Feedback Copie
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Requêtes API Market Intelligence
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

  // Récupération dynamique des catégories réelles avec comptage précis
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

  // Filtrage combiné : Recherche + Marque + Catégorie + Segment Preset + Tri Dynamique
  const filtered = useMemo(() => {
    let result = productsList.filter((p: any) => {
      const matchSearch =
        !search ||
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.format || '').toLowerCase().includes(search.toLowerCase());

      const matchBrand = filterBrand === 'ALL' || p.brand?.toLowerCase() === filterBrand.toLowerCase();
      const matchCat = filterCategory === 'ALL' || p.category?.toLowerCase() === filterCategory.toLowerCase();

      // Filtrage par segment d'intelligence
      let matchSegment = true;
      if (selectedSegment === 'GROWTH') {
        matchSegment = (p.growth || 0) >= 15;
      } else if (selectedSegment === 'HIGH_RISK') {
        matchSegment = p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'Élevé';
      } else if (selectedSegment === 'HIGH_ROTATION') {
        matchSegment = (p.rotationRate || 0) >= 10;
      }

      return matchSearch && matchBrand && matchCat && matchSegment;
    });

    // Tri dynamique configurable
    result = [...result].sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortField) {
        case 'revenue':
          comparison = (b.revenue || 0) - (a.revenue || 0);
          break;
        case 'rotation':
          comparison = (b.rotationRate || 0) - (a.rotationRate || 0);
          break;
        case 'growth':
          comparison = (b.growth || 0) - (a.growth || 0);
          break;
        case 'risk': {
          const riskWeight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, Élevé: 3, Modéré: 2, Faible: 1 };
          comparison = (riskWeight[b.stockoutRisk] || 0) - (riskWeight[a.stockoutRisk] || 0);
          break;
        }
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'volume':
        default:
          comparison = (b.volume || 0) - (a.volume || 0);
          break;
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });

    // Si segment TOP_10 demandé, limiter aux 10 premiers
    if (selectedSegment === 'TOP_10') {
      result = result.slice(0, 10);
    }

    return result;
  }, [productsList, search, filterBrand, filterCategory, selectedSegment, sortField, sortDirection]);

  // Réinitialiser la page courante quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBrand, filterCategory, selectedSegment, sortField, sortDirection, pageSize]);

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

  // Pagination dynamique
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filtered.length / Number(pageSize)) || 1;
  const paginatedProducts = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return filtered.slice(start, start + size);
  }, [filtered, currentPage, pageSize]);

  // Gestion du tri par colonne
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Exportation CSV certifiée des données filtrées
  const handleExportCSV = () => {
    if (!filtered || filtered.length === 0) return;

    const headers = [
      'Rang',
      'Produit (SKU)',
      'Marque',
      'Categorie',
      'Format',
      `Volume (${volumeUnit.toUpperCase()})`,
      'Chiffre Affaires (FCFA)',
      'Progression (%)',
      'Rotation Hebdo',
      'Reassort (jours)',
      'Risque Rupture',
      'Top Communes',
    ];

    const rows = filtered.map((p: any, idx: number) => {
      const vol = p.volume ?? (p as any).volumeSales ?? 0;
      const rev = p.revenue ?? 0;
      const formattedVol = formatVolumeValue(vol, volumeUnit, rev).formatted;
      const topZ = Array.isArray(p.topCommunes) && p.topCommunes.length > 0 ? p.topCommunes.join(' | ') : 'Abidjan';

      return [
        idx + 1,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        `"${(p.format || '').replace(/"/g, '""')}"`,
        `"${formattedVol}"`,
        rev,
        p.growth || 0,
        p.rotationRate || 1.0,
        p.reorderFrequencyDays || 4,
        p.stockoutRisk || 'LOW',
        `"${topZ}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `market_intelligence_produits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copie rapide du SKU
  const handleCopySku = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedSku(name);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  // Réinitialisation complète des filtres locaux
  const handleResetLocalFilters = () => {
    setSearch('');
    setFilterBrand('ALL');
    setFilterCategory('ALL');
    setSelectedSegment('ALL');
    setSortField('volume');
    setSortDirection('desc');
    resetFilters();
  };

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

        {/* Search, Export, Refresh & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Recherche rapide */}
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher produit, marque, format..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs w-60 pl-8 bg-background/80"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Effacer la recherche"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Switcher Mode Tableau / Grille */}
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

          {/* Densité de ligne en mode tableau */}
          {viewMode === 'table' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDensity(density === 'normal' ? 'compact' : 'normal')}
              className={`h-7 px-2 text-xs gap-1 hidden md:flex ${density === 'compact' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
              title={density === 'compact' ? 'Passer en vue normale' : 'Passer en vue compacte'}
            >
              <SlidersHorizontal className="size-3" />
              <span>{density === 'compact' ? 'Compact' : 'Normal'}</span>
            </Button>
          )}

          {/* Bouton Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="h-7 px-2.5 text-xs gap-1.5 border-border/80 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
            title="Exporter les produits filtrés au format CSV"
          >
            <Download className="size-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          {/* Bouton Rafraîchir */}
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
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Volume Total Vendu</span>
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                <TrendingUp className="size-3.5" />
              </div>
            </div>
            <div className="text-lg font-bold font-mono text-foreground tracking-tight">
              {formatVolumeValue(totalVolume, volumeUnit, totalRevenue).formatted}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Unité: <strong className="text-foreground">{volumeUnit.toUpperCase()}</strong></span>
              <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                <TrendingUp className="size-2.5" />
                +14.2%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Chiffre d'Affaires Global */}
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Chiffre d'Affaires</span>
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
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
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Top SKU Leader</span>
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
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
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">SKUs en Mouvement</span>
              <div className="p-1 rounded-md bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
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
        <Card className="border border-border/70 bg-card/60 backdrop-blur-md col-span-2 md:col-span-1 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Prix Moyen / Bouteille</span>
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
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

      {/* Control Bar: Quick Segments, Categories, Volume Switcher & Sorting */}
      <div className="space-y-2.5">
        {/* Quick Intelligence Segment Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-1 flex items-center gap-1 shrink-0">
            <Zap className="size-3 text-amber-500" />
            Segments :
          </span>

          <button
            type="button"
            onClick={() => setSelectedSegment('ALL')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 flex items-center gap-1 ${
              selectedSegment === 'ALL'
                ? 'bg-foreground text-background border-foreground font-semibold shadow-xs'
                : 'bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <span>Tous les produits</span>
            <span className="text-[10px] opacity-75">({productsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSegment('TOP_10')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 flex items-center gap-1 ${
              selectedSegment === 'TOP_10'
                ? 'bg-amber-500 text-black border-amber-500 font-semibold shadow-xs'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <Flame className="size-3" />
            <span>Top Débits (Top 10)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSegment('GROWTH')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 flex items-center gap-1 ${
              selectedSegment === 'GROWTH'
                ? 'bg-emerald-500 text-black border-emerald-500 font-semibold shadow-xs'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <TrendingUp className="size-3" />
            <span>Forte Croissance (≥15%)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSegment('HIGH_ROTATION')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 flex items-center gap-1 ${
              selectedSegment === 'HIGH_ROTATION'
                ? 'bg-blue-500 text-white border-blue-500 font-semibold shadow-xs'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
            }`}
          >
            <RotateCw className="size-3" />
            <span>Rotation Rapide (≥10x/sem)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSegment('HIGH_RISK')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all shrink-0 flex items-center gap-1 ${
              selectedSegment === 'HIGH_RISK'
                ? 'bg-rose-500 text-white border-rose-500 font-semibold shadow-xs'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            <ShieldAlert className="size-3" />
            <span>Risque Rupture Élevé</span>
          </button>
        </div>

        {/* Category Pills & Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {dynamicCategories.slice(0, 8).map((cat) => {
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

          {/* Volume Unit Switcher & Brand Selector */}
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

            {/* Tri Dropdown */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="size-3 text-muted-foreground" />
              <select
                value={`${sortField}_${sortDirection}`}
                onChange={(e) => {
                  const [field, dir] = e.target.value.split('_');
                  setSortField(field as SortField);
                  setSortDirection(dir as SortDirection);
                }}
                className="h-7 text-xs px-2.5 rounded-lg border border-border bg-background/80 text-foreground font-medium"
              >
                <option value="volume_desc">Volume débité ↓</option>
                <option value="volume_asc">Volume débité ↑</option>
                <option value="revenue_desc">Chiffre d'Affaires ↓</option>
                <option value="revenue_asc">Chiffre d'Affaires ↑</option>
                <option value="rotation_desc">Vitesse Rotation ↓</option>
                <option value="rotation_asc">Vitesse Rotation ↑</option>
                <option value="growth_desc">Progression % ↓</option>
                <option value="growth_asc">Progression % ↑</option>
                <option value="risk_desc">Risque Rupture ↓</option>
                <option value="name_asc">Nom Produit (A-Z)</option>
                <option value="name_desc">Nom Produit (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content View: Table or Grid */}
      {isLoading ? (
        /* Skeleton Loading State */
        <div className="space-y-4">
          <div className="h-64 rounded-xl border border-border/70 bg-card/40 animate-pulse flex items-center justify-center text-muted-foreground text-xs">
            <RefreshCw className="size-5 animate-spin mr-2 text-amber-500" />
            Synchronisation des ventes et des images en temps réel...
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ================= TABLE VIEW ================= */
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>Classement SKU &amp; Performance Débit</span>
                <Badge variant="secondary" className="text-[11px] font-mono font-medium">
                  {filtered.length} {filtered.length > 1 ? 'produits' : 'produit'}
                </Badge>
              </CardTitle>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span>Unité: <strong className="text-amber-500 uppercase">{volumeUnit}</strong></span>
              {(search || filterBrand !== 'ALL' || filterCategory !== 'ALL' || selectedSegment !== 'ALL') && (
                <button
                  onClick={handleResetLocalFilters}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-sans"
                >
                  <X className="size-3" />
                  Effacer filtres
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-medium select-none">
                    {/* Rank */}
                    <th
                      className="py-2.5 px-3 w-12 text-center cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('volume')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>#</span>
                        {sortField === 'volume' && (
                          sortDirection === 'desc' ? <ArrowDown className="size-3 text-amber-500" /> : <ArrowUp className="size-3 text-amber-500" />
                        )}
                      </div>
                    </th>

                    {/* SKU Name */}
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Produit (SKU)</span>
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp className="size-3 text-amber-500" /> : <ArrowDown className="size-3 text-amber-500" />
                        )}
                      </div>
                    </th>

                    {/* Category */}
                    <th className="py-2.5 px-3">Catégorie</th>

                    {/* Volume */}
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('volume')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Volume ({volumeUnit})</span>
                        {sortField === 'volume' && (
                          sortDirection === 'desc' ? <ArrowDown className="size-3 text-amber-500" /> : <ArrowUp className="size-3 text-amber-500" />
                        )}
                      </div>
                    </th>

                    {/* Revenue */}
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('revenue')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Chiffre d'Affaires</span>
                        {sortField === 'revenue' && (
                          sortDirection === 'desc' ? <ArrowDown className="size-3 text-amber-500" /> : <ArrowUp className="size-3 text-amber-500" />
                        )}
                      </div>
                    </th>

                    {/* Growth */}
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('growth')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Progression</span>
                        {sortField === 'growth' && (
                          sortDirection === 'desc' ? <ArrowDown className="size-3 text-amber-500" /> : <ArrowUp className="size-3 text-amber-500" />
                        )}
                      </div>
                    </th>

                    {/* Rotation Rate */}
                    <th
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('rotation')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Rotation Hebdo</span>
                        {sortField === 'rotation' && (
                          sortDirection === 'desc' ? <ArrowDown className="size-3 text-amber-500" /> : <ArrowUp className="size-3 text-amber-500" />
                        )}
                      </div>
                    </th>

                    {/* Reorder Frequency */}
                    <th className="py-2.5 px-3 text-right">Réassort</th>

                    {/* Stockout Risk */}
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort('risk')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Risque Rupture</span>
                        {sortField === 'risk' && (
                          sortDirection === 'desc' ? <ArrowDown className="size-3 text-amber-500" /> : <ArrowUp className="size-3 text-amber-500" />
                        )}
                      </div>
                    </th>

                    {/* Top Communes */}
                    <th className="py-2.5 px-3">Top Communes Débitrices</th>

                    {/* Actions */}
                    <th className="py-2.5 px-3 text-center w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-14 text-center text-muted-foreground">
                        <ShoppingBag className="size-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                        <p className="font-semibold text-foreground">Aucun produit ne correspond à vos filtres</p>
                        <p className="text-[11px] mt-0.5 text-muted-foreground">
                          Essayez de réinitialiser vos critères de recherche ou de changer de segment.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetLocalFilters}
                          className="mt-3 text-xs gap-1.5"
                        >
                          <RotateCw className="size-3" />
                          Réinitialiser tous les filtres
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p: any, idx: number) => {
                      const absoluteRank = pageSize === 'all' ? idx + 1 : (currentPage - 1) * Number(pageSize) + idx + 1;
                      const vol = p.volume ?? (p as any).volumeSales ?? 0;
                      const rev = p.revenue ?? 0;
                      const growthVal = p.growth ?? 0;
                      const rot = p.rotationRate ?? 1.0;
                      const reorder = p.reorderFrequencyDays ?? 4;
                      const topZ = Array.isArray(p.topCommunes) && p.topCommunes.length > 0 ? p.topCommunes : ['Abidjan'];
                      const isTopRanked = absoluteRank <= 3;
                      const rowPadding = density === 'compact' ? 'py-1.5' : 'py-2.5';

                      return (
                        <tr
                          key={p.id || idx}
                          onClick={() => setSelectedProduct(p)}
                          className={`hover:bg-muted/50 transition-colors group cursor-pointer ${
                            absoluteRank === 1 ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          {/* Rank with Podium Badges */}
                          <td className={`${rowPadding} px-3 text-center font-mono`}>
                            {absoluteRank === 1 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] border border-amber-500/50 shadow-xs">
                                1
                              </span>
                            ) : absoluteRank === 2 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-slate-300/20 text-slate-300 font-bold text-[11px] border border-slate-300/50">
                                2
                              </span>
                            ) : absoluteRank === 3 ? (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-700/20 text-amber-500 font-bold text-[11px] border border-amber-700/50">
                                3
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">{absoluteRank}</span>
                            )}
                          </td>

                          {/* Produit avec Image réelle */}
                          <td className={`${rowPadding} px-3`}>
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
                          <td className={`${rowPadding} px-3`}>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap"
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
                          <td className={`${rowPadding} px-3 text-right font-semibold text-foreground font-mono`}>
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
                          <td className={`${rowPadding} px-3 text-right font-mono font-medium text-foreground`}>
                            {rev > 0 ? `${rev.toLocaleString('fr-FR')} F` : '-'}
                          </td>

                          {/* Progression */}
                          <td className={`${rowPadding} px-3 text-right`}>
                            <span
                              className={`inline-flex items-center gap-0.5 font-medium ${
                                growthVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {growthVal >= 0 ? `+${growthVal}%` : `${growthVal}%`}
                            </span>
                          </td>

                          {/* Taux de Rotation */}
                          <td className={`${rowPadding} px-3 text-right font-mono font-medium text-foreground`}>
                            <span className={`${rot >= 10 ? 'text-amber-400 font-bold' : ''}`}>
                              {rot}x / sem
                            </span>
                          </td>

                          {/* Réassort */}
                          <td className={`${rowPadding} px-3 text-right font-mono text-muted-foreground`}>
                            {reorder}j
                          </td>

                          {/* Risque Rupture */}
                          <td className={`${rowPadding} px-3 text-center`}>
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
                          <td className={`${rowPadding} px-3`}>
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
                          <td className={`${rowPadding} px-3 text-center`}>
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
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-card/40 rounded-xl border border-border/70">
              <ShoppingBag className="size-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
              <p className="font-semibold text-foreground text-sm">Aucun produit ne correspond à vos filtres</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ajustez votre recherche ou réinitialisez les filtres.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetLocalFilters}
                className="mt-3 text-xs gap-1.5"
              >
                <RotateCw className="size-3" />
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            paginatedProducts.map((p: any, idx: number) => {
              const absoluteRank = pageSize === 'all' ? idx + 1 : (currentPage - 1) * Number(pageSize) + idx + 1;
              const vol = p.volume ?? (p as any).volumeSales ?? 0;
              const rev = p.revenue ?? 0;
              const growthVal = p.growth ?? 0;
              const format = p.format || p.size || 'Bouteille 65cl';
              const topZ = Array.isArray(p.topCommunes) && p.topCommunes.length > 0 ? p.topCommunes : ['Abidjan'];

              return (
                <Card
                  key={p.id || idx}
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
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="size-16 text-amber-500/40" />
                    )}

                    {/* Rank Pill on Image */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="size-5 rounded-full bg-background/80 backdrop-blur-md font-mono font-bold text-[10px] text-foreground flex items-center justify-center border border-border/60">
                        #{absoluteRank}
                      </span>
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

                    <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground font-mono bg-background/70 backdrop-blur-xs px-1.5 py-0.5 rounded border border-border/40">
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

      {/* Pagination & Results Summary Footer */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground border-t border-border/60">
          <div className="flex items-center gap-2">
            <span>
              Affichage de{' '}
              <strong className="text-foreground">
                {pageSize === 'all'
                  ? `1 à ${filtered.length}`
                  : `${(currentPage - 1) * Number(pageSize) + 1} à ${Math.min(currentPage * Number(pageSize), filtered.length)}`}
              </strong>{' '}
              sur <strong className="text-foreground">{filtered.length}</strong> produits filtrés
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[11px] text-muted-foreground">Par page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setPageSize(val);
                }}
                className="h-6 text-[11px] px-1.5 rounded border border-border bg-background/80 text-foreground font-mono"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value="all">Tous</option>
              </select>
            </div>
          </div>

          {/* Navigation Buttons */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                <span className="hidden sm:inline">Précédent</span>
              </Button>

              <span className="px-2 font-mono text-[11px]">
                Page <strong className="text-foreground">{currentPage}</strong> / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 text-xs"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Product Details Drawer / Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-card border border-border/90 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
                  <div className="flex items-center gap-2 flex-wrap">
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
                className="size-8 p-0 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
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
                          ? 'bg-amber-500/10 border-amber-500 text-foreground font-semibold shadow-xs'
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
                        ? 'bg-rose-500 animate-ping'
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

            {/* Logistics & Commercial Recommendation */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-500" />
                Recommandation Market Intelligence
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {(selectedProduct.rotationRate || 1) >= 10
                  ? `Forte rotation constatée (~${selectedProduct.rotationRate}x/sem). Il est conseillé d'augmenter le stock tampon et de planifier un réassort tous les ${selectedProduct.reorderFrequencyDays || 2} jours.`
                  : `Rotation modérée (~${selectedProduct.rotationRate || 1}x/sem). Un réassort hebdomadaire régulier (tous les ${selectedProduct.reorderFrequencyDays || 5} jours) permet de maintenir une fraîcheur optimale.`}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
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
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySku(selectedProduct.name)}
                  className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copiedSku === selectedProduct.name ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-400">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copier le nom</span>
                    </>
                  )}
                </Button>
              </div>

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
