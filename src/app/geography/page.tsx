'use client';

import React, { useState } from 'react';
import { GEOGRAPHY_DATA } from '@/data/mockMarketData';
import { GeographicBarChart } from '@/components/charts/GeographicBarChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Globe } from 'lucide-react';
import { useGeographyQuery } from '@/hooks/market/useMarketQueries';

export default function GeographyPage() {
  const [search, setSearch] = useState('');
  const { data: apiGeoData, isLoading } = useGeographyQuery();

  const rawZones = apiGeoData?.zones?.length
    ? apiGeoData.zones
    : GEOGRAPHY_DATA.map((g) => ({
        id: g.id,
        zone: g.commune,
        city: g.city,
        country: "Côte d'Ivoire",
        volume: g.volume,
        growth: g.growthPercent,
        demandIndex: g.demandIndex,
        posCount: g.posCount,
        latitude: 5.3438,
        longitude: -4.0725,
      }));

  const filtered = rawZones.filter((g: any) =>
    (g.zone || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.country || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MapPin className="size-5 text-orange-500" />
              Intelligence Géographique &amp; Zonale
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Calcul géolocalisation...' : `${rawZones.length} Zones géolocalisées`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Résolution géographique par GPS direct ou fallback adresse établissement (country, city, square, othersquare via countries.ts).
          </p>
        </div>
        <div className="w-64">
          <Input
            placeholder="Filtrer une zone ou ville (ex: Cocody, Yopougon, Bouaké)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-background/80"
          />
        </div>
      </div>

      {/* Top Graphic Chart */}
      <GeographicBarChart data={filtered} />

      {/* Communes Detail Table */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-tight">
            Performance Détaillée par Commune &amp; Zone ({filtered.length} zones observées)
          </CardTitle>
          <CardDescription className="text-xs">
            Volume de ventes, croissance périodique et points GPS résolus
          </CardDescription>
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
                  <th className="py-2.5 px-3 text-right">Volume</th>
                  <th className="py-2.5 px-3 text-right">Évolution</th>
                  <th className="py-2.5 px-3 text-right">Indice Demande</th>
                  <th className="py-2.5 px-3 text-right">Points de Vente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((item: any) => (
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
                      {item.latitude ? `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}` : 'Résolu via adresse'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                      {Math.round(item.volume).toLocaleString('fr-FR')} u.
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center gap-0.5 font-medium ${item.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.growth >= 0 ? `+${item.growth}%` : `${item.growth}%`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Badge variant="outline" className="text-[10px] bg-background/50 font-mono py-0">
                        {item.demandIndex} pts
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                      {item.posCount} POS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}