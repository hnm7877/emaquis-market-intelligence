'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GEOGRAPHY_DATA } from '@/data/mockMarketData';
import { GeographicBarChart } from '@/components/charts/GeographicBarChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Navigation,
  Globe,
  Beer,
  DollarSign,
  Store,
  Flame,
  Search,
  Layers,
  BarChart3,
  TrendingUp,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useGeographyQuery } from '@/hooks/market/useMarketQueries';

// Import dynamique de la carte Leaflet (désactive le SSR pour éviter l'erreur window/document)
const MarketIntelligenceMap = dynamic(
  () =>
    import('@/components/maps/MarketIntelligenceMap').then(
      (mod) => mod.MarketIntelligenceMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[540px] md:h-[600px] rounded-2xl border border-border/80 bg-card/60 flex items-center justify-center backdrop-blur-md">
        <div className="flex flex-col items-center gap-3">
          <div className="size-9 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground font-medium animate-pulse">
            Chargement du moteur cartographique SIG temps réel...
          </p>
        </div>
      </div>
    ),
  }
);

export default function GeographyPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'map' | 'charts' | 'table'>('map');
  const { data: apiGeoData, isLoading, refetch } = useGeographyQuery();

  // Consolidation des données de zones géographiques
  const rawZones = useMemo(() => {
    if (apiGeoData?.zones?.length) {
      return apiGeoData.zones;
    }
    return GEOGRAPHY_DATA.map((g) => ({
      id: g.id,
      zone: g.commune,
      city: g.city,
      country: "Côte d'Ivoire",
      volume: g.volume,
      revenue: g.volume * 800,
      growth: g.growthPercent,
      demandIndex: g.demandIndex,
      posCount: g.posCount,
      latitude: 5.3438,
      longitude: -4.0725,
    }));
  }, [apiGeoData]);

  // Établissements individuels retournés par le backend
  const establishments = apiGeoData?.establishments || [];

  // Filtrage selon la saisie utilisateur
  const filtered = useMemo(() => {
    if (!search.trim()) return rawZones;
    const q = search.toLowerCase();
    return rawZones.filter(
      (g: any) =>
        (g.zone || '').toLowerCase().includes(q) ||
        (g.city || '').toLowerCase().includes(q) ||
        (g.country || '').toLowerCase().includes(q)
    );
  }, [rawZones, search]);

  // Métriques globales pour décideurs et brasseries
  const totalVolume = useMemo(
    () => rawZones.reduce((sum, z) => sum + (z.volume || 0), 0),
    [rawZones]
  );

  const totalRevenue = useMemo(
    () => rawZones.reduce((sum, z) => sum + (z.revenue || z.volume * 800 || 0), 0),
    [rawZones]
  );

  const totalPosCount = useMemo(() => {
    const fromZones = rawZones.reduce((sum, z) => sum + (z.posCount || 0), 0);
    return Math.max(fromZones, establishments.length, apiGeoData?.totalAnalyzedPos || 0);
  }, [rawZones, establishments, apiGeoData]);

  const topZone = useMemo(() => {
    if (!rawZones.length) return null;
    return [...rawZones].sort((a, b) => (b.volume || 0) - (a.volume || 0))[0];
  }, [rawZones]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* En-tête Principal & Indicateur Live */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MapPin className="size-5 text-orange-500" />
              Intelligence Géographique & Débit Réseau
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading
                ? 'Résolution GPS...'
                : `${rawZones.length} Zones géolocalisées · ${establishments.length || totalPosCount} Maquis`}
            </Badge>
            <Badge
              variant="secondary"
              className="text-[10px] bg-muted/60 text-muted-foreground gap-1 py-0.5"
            >
              <Radio className="size-3 text-orange-400 animate-pulse" />
              Cascade GPS GlobalSale / User
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Visualisation géospatiale haute précision pour brasseries et distributeurs : intensité des débits, parts de marché locales et couverture terrain.
          </p>
        </div>

        {/* Barre de recherche et raccourcis */}
        <div className="flex items-center gap-2">
          <div className="relative w-64 md:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Zone ou ville (ex: Yopougon, Cocody, Bouaké)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background/80 border-border/70"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 text-xs px-2.5"
            title="Rafraîchir les données de terrain"
          >
            <Sparkles className="size-3.5 text-orange-400" />
          </Button>
        </div>
      </div>

      {/* Cartes KPI Brasseries Synthétiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">Volume Débité</span>
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
                <Beer className="size-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-foreground mt-2">
              {Math.round(totalVolume).toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-normal text-muted-foreground">unités</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1 font-medium">
              <TrendingUp className="size-3" />
              <span>Consommation active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">Chiffre d'Affaires</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <DollarSign className="size-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-foreground mt-2">
              {(totalRevenue / 1000000).toFixed(1)}{' '}
              <span className="text-xs font-normal text-muted-foreground">M FCFA</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Réseau débit consolidé
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">Points de Vente</span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Store className="size-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-foreground mt-2">
              {totalPosCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">Maquis / POS</span>
            </div>
            <div className="text-[11px] text-cyan-400 mt-1">
              {rawZones.length} communes couvertes
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-pink-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">Zone Championne</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <Flame className="size-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-foreground mt-2 truncate">
              {topZone?.zone || 'Yopougon'}
            </div>
            <div className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
              <span>{Math.round(topZone?.volume || 0).toLocaleString('fr-FR')} u.</span>
              <span className="text-muted-foreground">· {topZone?.posCount || 0} maquis</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raccourcis de Vues (Carte interactive / Histogramme / Table détaillée) */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={activeTab === 'map' ? 'default' : 'outline'}
            onClick={() => setActiveTab('map')}
            className={`h-8 text-xs gap-1.5 ${activeTab === 'map' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-background/60'}`}
          >
            <Layers className="size-3.5" />
            Cartographie Dynamique SIG
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'charts' ? 'default' : 'outline'}
            onClick={() => setActiveTab('charts')}
            className={`h-8 text-xs gap-1.5 ${activeTab === 'charts' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-background/60'}`}
          >
            <BarChart3 className="size-3.5" />
            Analyse Comparative par Commune
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'table' ? 'default' : 'outline'}
            onClick={() => setActiveTab('table')}
            className={`h-8 text-xs gap-1.5 ${activeTab === 'table' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-background/60'}`}
          >
            <Navigation className="size-3.5" />
            Registre des Coordonnées
          </Button>
        </div>

        {search && (
          <Badge variant="outline" className="text-[11px] border-orange-500/40 text-orange-400">
            Filtre actif : {search} ({filtered.length} résultats)
          </Badge>
        )}
      </div>

      {/* 1. VUE CARTE LEAFLET / MAPBOX EN TEMPS RÉEL */}
      {activeTab === 'map' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <MarketIntelligenceMap
            zones={filtered}
            establishments={establishments}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 2. VUE GRAPHIQUES DE DISTRIBUTION */}
      {activeTab === 'charts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <GeographicBarChart data={filtered} />
        </div>
      )}

      {/* 3. VUE REGISTRE & TABLEAU DÉTAILLÉ */}
      {(activeTab === 'table' || activeTab === 'map') && (
        <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold tracking-tight">
                Performance Détaillée par Commune & Établissement ({filtered.length} zones recensées)
              </CardTitle>
              <CardDescription className="text-xs">
                Volume de ventes, chiffre d'affaires, tension de la demande et statut GPS (Direct vs Fallback adresse)
              </CardDescription>
            </div>
            {establishments.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                {establishments.filter((e: any) => e.hasDirectGps).length} points GPS Directs
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/60">
                  <tr>
                    <th className="py-2.5 px-3">Zone / Commune</th>
                    <th className="py-2.5 px-3">Ville</th>
                    <th className="py-2.5 px-3">Pays</th>
                    <th className="py-2.5 px-3">Coordonnées GPS</th>
                    <th className="py-2.5 px-3 text-right">Volume Débité</th>
                    <th className="py-2.5 px-3 text-right">Chiffre d'Affaires</th>
                    <th className="py-2.5 px-3 text-right">Évolution</th>
                    <th className="py-2.5 px-3 text-right">Indice Demande</th>
                    <th className="py-2.5 px-3 text-right">Maquis Actifs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((item: any) => {
                    const rev = item.revenue || item.volume * 800;
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground flex items-center gap-1.5">
                          <Navigation className="size-3 text-orange-400 shrink-0" />
                          <span>{item.zone}</span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{item.city}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="size-3 text-muted-foreground/70" />
                            <span>{item.country || "Côte d'Ivoire"}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                          {item.latitude && item.longitude ? (
                            <span className="text-emerald-400/90 font-semibold">
                              {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-amber-400/80">Fallback adresse</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                          {Math.round(item.volume).toLocaleString('fr-FR')} u.
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-purple-400">
                          {(rev / 1000000).toFixed(1)}M FCFA
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 font-medium ${
                              item.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.growth >= 0 ? `+${item.growth}%` : `${item.growth}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge variant="outline" className="text-[10px] bg-background/50 font-mono py-0">
                            {item.demandIndex || 110} pts
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                          {item.posCount} POS
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
    </div>
  );
}
