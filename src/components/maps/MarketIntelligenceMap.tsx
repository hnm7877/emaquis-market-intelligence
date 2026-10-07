'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeoZone, EstablishmentMarker } from '@/lib/validations/market.schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  TrendingUp,
  Layers,
  Store,
  Beer,
  Zap,
  DollarSign,
  Maximize2,
  X,
  Flame,
  ArrowRight,
  Radio,
  Compass,
  Mountain,
} from 'lucide-react';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { resolveZoneCoordinates } from '@/constants/coordinates';
import { formatGrowth, isAvailable } from '@/utils/metrics';
import 'leaflet/dist/leaflet.css';

interface MarketIntelligenceMapProps {
  zones: GeoZone[];
  establishments?: EstablishmentMarker[];
  isLoading?: boolean;
}

type MapMode = 'volume' | 'revenue' | 'demand' | 'pos';

interface BasemapStyle {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  url: string;
  labelsUrl?: string;
  attribution: string;
  maxZoom: number;
  description: string;
}

const BASEMAP_STYLES: BasemapStyle[] = [
  {
    id: 'dark',
    name: 'Sombre Canvas',
    shortName: 'Sombre',
    icon: '🌙',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; 100% Libre & Gratuit',
    maxZoom: 16,
    description: 'Style sombre haute lisibilité sans filigrane ni clé requise',
  },
  {
    id: 'relief',
    name: 'Relief & Topo',
    shortName: 'Relief',
    icon: '⛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, USGS, NOAA &mdash; Gratuit',
    maxZoom: 19,
    description: 'Relief ombré, collines et topographie naturelle (100% gratuit)',
  },
  {
    id: 'satellite',
    name: 'Satellite Aérien',
    shortName: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar &mdash; Gratuit',
    maxZoom: 19,
    description: 'Imagerie satellite haute définition réelle sans filigrane',
  },
  {
    id: 'streets',
    name: 'Rues & Monde',
    shortName: 'Rues',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors &mdash; Libre',
    maxZoom: 19,
    description: 'Plan urbain mondial détaillé OpenStreetMap 100% libre',
  },
];

export const MarketIntelligenceMap: React.FC<MarketIntelligenceMapProps> = ({
  zones = [],
  establishments = [],
  isLoading = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);
  const { setFilter } = useMarketFilterStore();

  const [activeMode, setActiveMode] = useState<MapMode>('volume');
  const [activeBasemap, setActiveBasemap] = useState<string>('dark');
  const [showEstablishments, setShowEstablishments] = useState(true);
  const [selectedZone, setSelectedZone] = useState<GeoZone | null>(null);
  const [selectedEst, setSelectedEst] = useState<EstablishmentMarker | null>(null);

  // Statistiques calculées pour l'en-tête
  const totalVolume = zones.reduce((s, z) => s + (z.volume || 0), 0);
  const totalPos = zones.reduce((s, z) => s + (z.posCount || 0), 0) || establishments.length || 0;

  const renderLayers = useCallback((L: any, map: any, group: any) => {
    group.clearLayers();
    const bounds: [number, number][] = [];

    // 1. Rendu des Zones géographiques (cercles proportionnels interactifs)
    zones.forEach((z, idx) => {
      let lat = Number(z.latitude);
      let lng = Number(z.longitude);

      if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0) {
        const resolved = resolveZoneCoordinates(z.zone, z.city, z.country, idx);
        lat = resolved.latitude;
        lng = resolved.longitude;
      }

      bounds.push([lat, lng]);

      let circleRadius = 18;
      let circleColor = '#f59e0b';
      let fillColor = '#f59e0b';
      let valueLabel = `${Math.round(z.volume).toLocaleString('fr-FR')} u.`;

      if (activeMode === 'volume') {
        circleRadius = Math.max(16, Math.min(50, Math.sqrt(z.volume) * 0.1));
        circleColor = z.volume > 50000 ? '#10b981' : z.volume > 10000 ? '#f59e0b' : '#3b82f6';
        fillColor = circleColor;
      } else if (activeMode === 'revenue') {
        const rev = z.revenue || 0;
        circleRadius = Math.max(16, Math.min(50, Math.sqrt(rev) * 0.003));
        circleColor = '#8b5cf6';
        fillColor = '#8b5cf6';
        valueLabel = `${(rev / 1000000).toFixed(1)}M FCFA`;
      } else if (activeMode === 'demand') {
        const demand = isAvailable(z.demandIndex) ? z.demandIndex : null;
        circleRadius = demand !== null ? Math.max(16, Math.min(46, (demand - 80) * 0.85)) : 16;
        circleColor = demand === null ? '#64748b' : demand >= 120 ? '#ef4444' : demand >= 105 ? '#f97316' : '#06b6d4';
        fillColor = circleColor;
        valueLabel = demand !== null ? `${demand} pts` : 'n/d';
      } else if (activeMode === 'pos') {
        circleRadius = Math.max(16, Math.min(46, z.posCount * 3.2));
        circleColor = '#06b6d4';
        fillColor = '#06b6d4';
        valueLabel = `${z.posCount} POS`;
      }

      // Halo thermique extérieur
      const halo = L.circleMarker([lat, lng], {
        radius: circleRadius * 1.6,
        fillColor: fillColor,
        color: 'transparent',
        weight: 0,
        opacity: 0,
        fillOpacity: 0.18,
        interactive: false,
      });
      halo.addTo(group);

      // Cercle principal
      const circle = L.circleMarker([lat, lng], {
        radius: circleRadius,
        fillColor: fillColor,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.72,
      });

      // Tooltip interactif riche
      circle.bindTooltip(
        `
        <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-family: system-ui, sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5); min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; color: #f8fafc; margin-bottom: 4px;">📍 ${z.zone}</div>
          <div style="font-size: 11px; color: #94a3b8;">${z.city} · ${z.country}</div>
          <div style="font-size: 11px; color: #38bdf8; font-weight: 600; margin-top: 4px;">Volume : ${z.volume.toLocaleString('fr-FR')} cols</div>
          <div style="font-size: 11px; color: #34d399;">CA observé : ${((z.revenue || 0) / 1000000).toFixed(1)}M FCFA</div>
          <div style="font-size: 11px; color: #fbbf24;">Établissements : ${z.posCount} maquis actifs</div>
          <div style="font-size: 11px; color: ${!isAvailable(z.growth) ? '#94a3b8' : z.growth >= 0 ? '#4ade80' : '#f87171'}; font-weight: 600; margin-top: 2px;">
            Dynamique : ${formatGrowth(z.growth)}
          </div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #f59e0b;">
            👉 Cliquez pour filtrer cette zone
          </div>
        </div>
        `,
        { direction: 'top', offset: [0, -circleRadius], opacity: 1, sticky: true }
      );

      circle.on('click', () => {
        setSelectedZone(z);
        setSelectedEst(null);
      });

      circle.addTo(group);

      // Badge texte visible directement sur la carte
      const textIcon = L.divIcon({
        className: 'zone-map-badge',
        html: `
          <div style="transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; pointer-events: none;">
            <span style="background: rgba(15, 23, 42, 0.88); color: #f8fafc; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.22); white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              ${z.zone}
            </span>
            <span style="font-size: 9px; font-weight: 600; color: ${circleColor}; background: rgba(0,0,0,0.65); padding: 1px 6px; border-radius: 4px; margin-top: 2px;">
              ${valueLabel}
            </span>
          </div>
        `,
        iconSize: [0, 0],
      });

      L.marker([lat, lng], { icon: textIcon }).addTo(group);
    });

    // 2. Rendu des Établissements individuels (Pins Maquis géolocalisés)
    if (showEstablishments && establishments.length > 0) {
      establishments.forEach((est) => {
        if (!est.latitude || !est.longitude) return;

        const estIcon = L.divIcon({
          className: 'custom-est-pin',
          html: `
            <div style="width: 22px; height: 22px; background: #090d16; border: 2px solid ${
              est.hasDirectGps ? '#10b981' : '#f59e0b'
            }; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${
            est.hasDirectGps ? 'rgba(16,185,129,0.55)' : 'rgba(245,158,11,0.45)'
          }; cursor: pointer; transition: transform 0.2s;">
              <span style="font-size: 11px;">🍺</span>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const estMarker = L.marker([est.latitude, est.longitude], { icon: estIcon });

        estMarker.bindTooltip(
          `
          <div style="background: rgba(15, 23, 42, 0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); color: #fff; font-family: system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
            <div style="font-weight: 700; font-size: 12px; color: #f8fafc;">🏪 ${est.name}</div>
            <div style="font-size: 10px; color: #94a3b8;">${est.zone} · ${est.city}</div>
            <div style="font-size: 10px; color: #10b981; font-weight: 600; margin-top: 3px;">
              ${est.volume.toLocaleString('fr-FR')} unités · ${(est.revenue / 1000).toFixed(0)}k FCFA
            </div>
            ${
              est.hasDirectGps
                ? '<div style="font-size: 9px; color: #34d399; margin-top: 2px;">📍 Signal GPS Direct Vente</div>'
                : '<div style="font-size: 9px; color: #fbbf24; margin-top: 2px;">📌 Localisé par adresse établissement</div>'
            }
          </div>
          `,
          { direction: 'top', offset: [0, -10], opacity: 1, sticky: true }
        );

        estMarker.on('click', () => {
          setSelectedEst(est);
          setSelectedZone(null);
        });

        estMarker.addTo(group);
      });
    }

    // Centrage adaptatif automatique
    if (bounds.length > 0) {
      try {
        if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        } else {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      } catch (err) {
        // Fallback sans crash
      }
    }
  }, [zones, establishments, activeMode, showEstablishments]);

  // Initialisation et gestion du cycle de vie Leaflet
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = await import('leaflet');

      if (!isMounted) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Centre par défaut : Abidjan / Côte d'Ivoire
      const map = L.map(mapContainerRef.current, {
        center: [5.36, -4.0083],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Fond de carte actif (100% gratuit, sans filigrane ni clé requise)
      const currentStyle = BASEMAP_STYLES.find((b) => b.id === activeBasemap) || BASEMAP_STYLES[0];
      const baseLayer = L.tileLayer(currentStyle.url, {
        maxZoom: currentStyle.maxZoom,
        attribution: currentStyle.attribution,
      }).addTo(map);

      baseLayerRef.current = baseLayer;

      if (currentStyle.labelsUrl) {
        const labelsLayer = L.tileLayer(currentStyle.labelsUrl, {
          maxZoom: currentStyle.maxZoom,
          opacity: 0.85,
        }).addTo(map);
        labelsLayerRef.current = labelsLayer;
      }

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;
      mapInstanceRef.current = map;

      // Détection automatique de redimensionnement de l'écran ou changement d'onglet
      const resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      renderLayers(L, map, layersGroup);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Changement dynamique du relief / fond de carte sans recharger
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const switchBasemap = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      if (!map) return;

      if (baseLayerRef.current) {
        map.removeLayer(baseLayerRef.current);
      }
      if (labelsLayerRef.current) {
        map.removeLayer(labelsLayerRef.current);
        labelsLayerRef.current = null;
      }

      const currentStyle = BASEMAP_STYLES.find((b) => b.id === activeBasemap) || BASEMAP_STYLES[0];
      const newLayer = L.tileLayer(currentStyle.url, {
        maxZoom: currentStyle.maxZoom,
        attribution: currentStyle.attribution,
      }).addTo(map);

      baseLayerRef.current = newLayer;

      if (currentStyle.labelsUrl) {
        const labelsLayer = L.tileLayer(currentStyle.labelsUrl, {
          maxZoom: currentStyle.maxZoom,
          opacity: 0.85,
        }).addTo(map);
        labelsLayerRef.current = labelsLayer;
      }

      if (baseLayerRef.current) {
        baseLayerRef.current.bringToBack();
      }
      if (layersGroupRef.current) {
        layersGroupRef.current.eachLayer((l: any) => {
          if (typeof l.bringToFront === 'function') l.bringToFront();
        });
      }
    };

    switchBasemap();
  }, [activeBasemap]);

  // Actualisation réactive des calques
  useEffect(() => {
    if (mapInstanceRef.current && layersGroupRef.current) {
      import('leaflet').then((L) => {
        renderLayers(L, mapInstanceRef.current, layersGroupRef.current);
      });
    }
  }, [zones, establishments, activeMode, showEstablishments, renderLayers]);

  // Réinitialiser la vue et centrer
  const handleResetView = () => {
    if (mapInstanceRef.current && zones.length > 0) {
      const bounds = zones
        .filter((z) => z.latitude && z.longitude)
        .map((z) => [z.latitude, z.longitude] as [number, number]);
      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const handleApplyZoneFilter = (zoneName: string) => {
    setFilter('commune', zoneName);
    setSelectedZone(null);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border/80 bg-card/60 backdrop-blur-md shadow-xl">
      {/* Barre d'outils et Sélecteurs : Métrique & Relief */}
      <div className="p-3.5 border-b border-border/80 bg-background/70 backdrop-blur-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Compass className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Cartographie Géostratégique</span>
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-emerald-500/40 text-emerald-400 font-mono">
                  100% Libre & Gratuit
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {zones.length} communes analysées · {totalPos} maquis connectés · {totalVolume.toLocaleString('fr-FR')} cols
              </p>
            </div>
          </div>
        </div>

        {/* Contrôles de métriques + Sélecteur de Relief */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélecteur de Relief (100% Gratuit / Zéro API Key / Zéro Filigrane) */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/80 shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-semibold px-1.5 hidden lg:inline flex items-center gap-1">
              <Layers className="size-3 text-orange-500" />
              Relief :
            </span>
            {BASEMAP_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setActiveBasemap(style.id)}
                className={
                  'h-7 px-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ' +
                  (activeBasemap === style.id
                    ? 'bg-orange-500 text-white font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70')
                }
                title={`${style.name} • ${style.description} (100% gratuit sans clé API)`}
              >
                <span>{style.icon}</span>
                <span className="hidden sm:inline">{style.shortName}</span>
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

          {/* Boutons de Mode Métrique */}
          <Button
            size="sm"
            variant={activeMode === 'volume' ? 'default' : 'outline'}
            onClick={() => setActiveMode('volume')}
            className={`h-7 text-xs gap-1.5 ${activeMode === 'volume' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-background/60'}`}
          >
            <Beer className="size-3" />
            Volume
          </Button>

          <Button
            size="sm"
            variant={activeMode === 'revenue' ? 'default' : 'outline'}
            onClick={() => setActiveMode('revenue')}
            className={`h-7 text-xs gap-1.5 ${activeMode === 'revenue' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-background/60'}`}
          >
            <DollarSign className="size-3" />
            CA
          </Button>

          <Button
            size="sm"
            variant={activeMode === 'demand' ? 'default' : 'outline'}
            onClick={() => setActiveMode('demand')}
            className={`h-7 text-xs gap-1.5 ${activeMode === 'demand' ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-background/60'}`}
          >
            <Zap className="size-3" />
            Tension
          </Button>

          <Button
            size="sm"
            variant={activeMode === 'pos' ? 'default' : 'outline'}
            onClick={() => setActiveMode('pos')}
            className={`h-7 text-xs gap-1.5 ${activeMode === 'pos' ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-background/60'}`}
          >
            <Store className="size-3" />
            POS
          </Button>

          {/* Toggle Maquis Individuels */}
          <Button
            size="sm"
            variant={showEstablishments ? 'secondary' : 'ghost'}
            onClick={() => setShowEstablishments(!showEstablishments)}
            className="h-7 text-xs gap-1 bg-background/60"
            title="Afficher ou masquer les marqueurs de maquis individuels"
          >
            <Layers className="size-3" />
            <span>{showEstablishments ? 'Pins ON' : 'Pins OFF'}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetView}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            title="Recentrer la carte"
          >
            <Maximize2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Conteneur de la Carte Leaflet */}
      <div className="relative w-full h-[540px] md:h-[620px] z-10">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Légende flottante interactive */}
        <div className="absolute bottom-4 left-4 z-[400] bg-background/90 backdrop-blur-md p-3 rounded-xl border border-border/80 shadow-lg text-xs space-y-1.5 max-w-[240px]">
          <div className="font-semibold text-foreground flex items-center justify-between text-[11px]">
            <span>Légende Brasserie</span>
            <span className="text-[10px] text-muted-foreground capitalize">{activeMode}</span>
          </div>
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-emerald-500 shadow-sm" />
              <span>Forte consommation (&gt; 50k u.)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-amber-500 shadow-sm" />
              <span>Consommation soutenue (10k-50k u.)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-blue-500 shadow-sm" />
              <span>Zone en consolidation (&lt; 10k u.)</span>
            </div>
          </div>
          <div className="pt-1.5 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Fond : {BASEMAP_STYLES.find((b) => b.id === activeBasemap)?.name}</span>
            <span className="text-emerald-400 font-mono">100% Free</span>
          </div>
        </div>

        {/* Panneau Popover Détail Zone sélectionnée */}
        {selectedZone && (
          <div className="absolute top-4 right-4 z-[400] w-80 bg-background/95 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-2xl animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">{selectedZone.zone}</h4>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {selectedZone.city}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedZone.country}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedZone(null)}
                className="size-6 rounded-full hover:bg-muted"
              >
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 my-3 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground text-[11px] block">Volume Consommé</span>
                <span className="font-bold text-sm text-foreground font-mono">
                  {selectedZone.volume.toLocaleString('fr-FR')} cols
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground text-[11px] block">Chiffre d'Affaires</span>
                <span className="font-bold text-sm text-emerald-400 font-mono">
                  {((selectedZone.revenue || 0) / 1000000).toFixed(1)}M FCFA
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground text-[11px] block">Maquis Connectés</span>
                <span className="font-bold text-sm text-cyan-400 font-mono">
                  {selectedZone.posCount} POS
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground text-[11px] block">Indice Demande</span>
                <span className="font-bold text-sm text-amber-400 font-mono">
                  {isAvailable(selectedZone.demandIndex) ? `${selectedZone.demandIndex} (base 100)` : 'n/d'}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleApplyZoneFilter(selectedZone.zone)}
              className="w-full text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-md"
            >
              <span>Filtrer les analyses sur {selectedZone.zone}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Panneau Popover Détail Établissement sélectionné */}
        {selectedEst && (
          <div className="absolute top-4 right-4 z-[400] w-80 bg-background/95 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-2xl animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <span>🏪</span>
                  <span>{selectedEst.name}</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedEst.zone} · {selectedEst.city}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEst(null)}
                className="size-6 rounded-full hover:bg-muted"
              >
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="space-y-2 my-3 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Volume débité :</span>
                <span className="font-bold text-foreground font-mono">{selectedEst.volume.toLocaleString('fr-FR')} cols</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Chiffre d'Affaires :</span>
                <span className="font-bold text-emerald-400 font-mono">{(selectedEst.revenue / 1000).toFixed(0)}k FCFA</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Statut géolocalisation :</span>
                <span className="text-[10px] font-medium text-emerald-400">
                  {selectedEst.hasDirectGps ? '📍 Coordonnées GPS directes' : '📌 Géocodage adresse'}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleApplyZoneFilter(selectedEst.zone)}
              className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md"
            >
              <span>Voir toute la zone {selectedEst.zone}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
