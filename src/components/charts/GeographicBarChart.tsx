'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GEOGRAPHY_DATA } from '@/data/mockMarketData';
import { useGeographyQuery } from '@/hooks/market/useMarketQueries';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { formatVolumeValue, VOLUME_UNIT_OPTIONS } from '@/utils/volumeUnit';
import { resolveZoneCoordinates } from '@/constants/coordinates';
import {
  Flame,
  BarChart3,
  MapPin,
  Gauge,
  Sparkles,
  Filter,
  Navigation,
  Compass,
  Layers,
  Calendar,
  Sun,
  CloudRain,
  PartyPopper,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface GeographicBarChartProps {
  data?: any[];
}

interface ZonePoint {
  id: string;
  zone: string;
  commune: string;
  city: string;
  country: string;
  rawVolume: number;
  seasonalVolume: number;
  revenue: number;
  posCount: number;
  demandIndex: number;
  growth: number;
  latitude: number;
  longitude: number;
  intensity: number; // 15 (calme) à 98 (brûlant)
  color: string;
  coreRadius: number;
  haloRadius: number;
  badgeText: string;
  tier: 'hot' | 'warm' | 'medium' | 'cool' | 'cold';
}

/**
 * Fonds de carte et reliefs 100% GRATUITS (ZÉRO CLÉ API REQUISE, AUCUN FILIGRANE)
 */
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
    description: 'Fond sombre haute définition pour faire ressortir les halos thermiques sans aucun filigrane',
  },
  {
    id: 'relief',
    name: 'Relief & Topo',
    shortName: 'Relief',
    icon: '⛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, USGS, NOAA &mdash; Gratuit',
    maxZoom: 19,
    description: 'Relief ombré, collines et topographie géographique naturelle',
  },
  {
    id: 'satellite',
    name: 'Satellite Aérien',
    shortName: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar &mdash; Gratuit',
    maxZoom: 19,
    description: 'Imagerie satellite réelle haute résolution sans watermark',
  },
  {
    id: 'streets',
    name: 'Rues & Monde',
    shortName: 'Rues',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors &mdash; Libre',
    maxZoom: 19,
    description: 'Cartographie routière mondiale OpenStreetMap officielle',
  },
];

type SeasonMode = 'all' | 'dry' | 'rainy' | 'festive';

interface SeasonOption {
  id: SeasonMode;
  label: string;
  shortLabel: string;
  icon: string;
  factor: number;
  description: string;
}

const SEASONS: SeasonOption[] = [
  {
    id: 'all',
    label: 'Toutes saisons (Consolidé)',
    shortLabel: 'Global',
    icon: '📅',
    factor: 1.0,
    description: 'Consommation globale moyenne consolidée',
  },
  {
    id: 'festive',
    label: 'Période Festive (Nov - Jan)',
    shortLabel: 'Fêtes (Nov-Jan)',
    icon: '🎉',
    factor: 1.35,
    description: 'Pic annuel de fin d\'année, forte affluence maquis & terrasses (+35%)',
  },
  {
    id: 'dry',
    label: 'Saison Sèche (Fév - Mai)',
    shortLabel: 'Saison Sèche',
    icon: '☀️',
    factor: 1.2,
    description: 'Forte chaleur, pic de consommation désaltérante & bières (+20%)',
  },
  {
    id: 'rainy',
    label: 'Saison des Pluies (Juin - Oct)',
    shortLabel: 'Pluies (Juin-Oct)',
    icon: '🌧️',
    factor: 0.85,
    description: 'Ralentissement extérieur, consommation concentrée en intérieur (-15%)',
  },
];

/**
 * Calcul de l'intensité thermique et du dimensionnement des bulles par volume
 */
const getVolumeThermalProps = (volume: number, maxVolume: number) => {
  const safeVol = Math.max(0, volume);
  const ratio = Math.min(1, Math.max(0, safeVol / Math.max(maxVolume, 1)));
  const intensity = Math.round(15 + ratio * 83); // Échelle 15° à 98°

  // Taille strictement proportionnelle aux volumes de ventes
  const coreRadius = Math.max(11, Math.min(42, Math.round(10 + Math.sqrt(safeVol) * 0.13)));
  const haloRadius = Math.round(coreRadius * 2.1);

  if (intensity >= 80) {
    return {
      intensity,
      color: '#ef4444', // Rouge incandescent brûlant
      coreRadius,
      haloRadius,
      badgeText: `🔥 ${intensity}°`,
      tier: 'hot' as const,
    };
  }
  if (intensity >= 60) {
    return {
      intensity,
      color: '#f97316', // Orange intense
      coreRadius,
      haloRadius,
      badgeText: `⚡ ${intensity}°`,
      tier: 'warm' as const,
    };
  }
  if (intensity >= 40) {
    return {
      intensity,
      color: '#eab308', // Jaune ambre
      coreRadius,
      haloRadius,
      badgeText: `🟡 ${intensity}°`,
      tier: 'medium' as const,
    };
  }
  if (intensity >= 25) {
    return {
      intensity,
      color: '#10b981', // Vert émeraude
      coreRadius,
      haloRadius,
      badgeText: `🟢 ${intensity}°`,
      tier: 'cool' as const,
    };
  }
  return {
    intensity,
    color: '#06b6d4', // Cyan calme
    coreRadius,
    haloRadius,
    badgeText: `❄️ ${intensity}°`,
    tier: 'cold' as const,
  };
};

export function GeographicBarChart({ data }: GeographicBarChartProps) {
  const store = useMarketFilterStore();
  const volumeUnit = store.volumeUnit || 'cols';
  const { filters } = store;
  const { data: apiGeoData } = useGeographyQuery();

  const [viewMode, setViewMode] = useState<'heat' | 'bar'>('heat');
  const [selectedSeason, setSelectedSeason] = useState<SeasonMode>('all');
  const [selectedZone, setSelectedZone] = useState<ZonePoint | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<string>('dark');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);

  // Données de base
  const rawZones = useMemo(() => {
    if (data && data.length > 0) return data;
    if (apiGeoData?.zones && apiGeoData.zones.length > 0) return apiGeoData.zones;
    return GEOGRAPHY_DATA;
  }, [data, apiGeoData?.zones]);

  // Facteur saisonnier actif
  const activeSeasonConfig = useMemo(() => {
    return SEASONS.find((s) => s.id === selectedSeason) || SEASONS[0];
  }, [selectedSeason]);

  // Normalisation robuste pour multi-sélections (accents, apostrophes, ponctuation)
  const cleanKey = (val?: string) =>
    (val || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const parseFilterList = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .flatMap((v) => (typeof v === 'string' ? v.split(',') : [v]))
        .map((s) => cleanKey(String(s)))
        .filter((s) => s && s !== 'all' && s !== 'tous' && !s.startsWith('tout'));
    }
    if (typeof val === 'string') {
      return val
        .split(',')
        .map((s) => cleanKey(s))
        .filter((s) => s && s !== 'all' && s !== 'tous' && !s.startsWith('tout'));
    }
    return [];
  };

  // Filtrage automatique selon les filtres sélectionnés (pays, villes, communes)
  const filteredZones = useMemo(() => {
    const countryFilters = parseFilterList(filters.country);
    const cityFilters = parseFilterList(filters.city);
    const communeFilters = parseFilterList(filters.commune);

    return rawZones.filter((z: any) => {
      // 1. Filtre Pays
      if (countryFilters.length > 0) {
        const zCountry = cleanKey(z.country || "Côte d'Ivoire");
        const matchesCountry = countryFilters.some((cf) => {
          return (
            zCountry.includes(cf) ||
            cf.includes(zCountry) ||
            (cf.includes('congo') && (zCountry.includes('congo') || zCountry.includes('rdc'))) ||
            (cf.includes('rdc') && zCountry.includes('congo'))
          );
        });
        if (!matchesCountry) return false;
      }

      // 2. Filtre Ville
      if (cityFilters.length > 0) {
        const zCity = cleanKey(z.city || '');
        const zZone = cleanKey(z.zone || z.commune || '');
        const matchesCity = cityFilters.some(
          (cf) => zCity.includes(cf) || cf.includes(zCity) || zZone.includes(cf) || cf.includes(zZone)
        );
        if (!matchesCity) return false;
      }

      // 3. Filtre Commune
      if (communeFilters.length > 0) {
        const zCommune = cleanKey(z.zone || z.commune || '');
        const zCity = cleanKey(z.city || '');
        const matchesCommune = communeFilters.some(
          (cf) => zCommune.includes(cf) || cf.includes(zCommune) || zCity.includes(cf) || cf.includes(zCity)
        );
        if (!matchesCommune) return false;
      }

      return true;
    });
  }, [rawZones, filters.country, filters.city, filters.commune]);

  // Calcul du volume maximal tenant compte de la saison
  const maxSeasonalVolume = useMemo(() => {
    const vols = filteredZones.map((z: any) => (Number(z.volume) || 0) * activeSeasonConfig.factor);
    return Math.max(...vols, 1);
  }, [filteredZones, activeSeasonConfig.factor]);

  // Points thermiques formatés avec coordonnées GPS résolues avec précision
  const zonePoints: ZonePoint[] = useMemo(() => {
    return filteredZones.map((z: any, idx: number) => {
      const commune = (z.zone || z.commune || 'Zone').trim();
      const city = z.city || 'Abidjan';
      const country = z.country || "Côte d'Ivoire";

      const baseVolume = Math.round(Number(z.volume) || 0);
      const seasonalVolume = Math.round(baseVolume * activeSeasonConfig.factor);
      const revenue = Math.round(Number(z.revenue) || seasonalVolume * 800);
      const posCount = Number(z.posCount) || 1;
      const demandIndex = Number(z.demandIndex) || 100;
      const growth = Number(z.growth || z.growthPercent) || 12;

      // Résolution GPS précise sans chevauchement via le dictionnaire officiel
      let latitude = Number(z.latitude);
      let longitude = Number(z.longitude);

      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude) || latitude === 0) {
        const resolved = resolveZoneCoordinates(commune, city, country, idx);
        latitude = resolved.latitude;
        longitude = resolved.longitude;
      }

      const thermalProps = getVolumeThermalProps(seasonalVolume, maxSeasonalVolume);

      return {
        id: z.id || `zone-${commune.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`,
        zone: commune,
        commune,
        city,
        country,
        rawVolume: baseVolume,
        seasonalVolume,
        revenue,
        posCount,
        demandIndex,
        growth,
        latitude,
        longitude,
        intensity: thermalProps.intensity,
        color: thermalProps.color,
        coreRadius: thermalProps.coreRadius,
        haloRadius: thermalProps.haloRadius,
        badgeText: thermalProps.badgeText,
        tier: thermalProps.tier,
      };
    });
  }, [filteredZones, activeSeasonConfig.factor, maxSeasonalVolume]);

  // Données pour l'histogramme Recharts
  const chartData = useMemo(() => {
    return zonePoints.map((zp) => {
      const formatted = formatVolumeValue(zp.seasonalVolume, volumeUnit, zp.revenue);
      return {
        commune: zp.commune,
        city: zp.city,
        rawVolume: zp.seasonalVolume,
        formattedVolume: formatted.value,
        unitLabel: formatted.unit,
        posCount: zp.posCount,
        demandIndex: zp.demandIndex,
        growthPercent: zp.growth,
        tempColor: zp.color,
        intensity: zp.intensity,
      };
    });
  }, [zonePoints, volumeUnit]);

  // Initialisation et actualisation de la carte Leaflet
  useEffect(() => {
    if (viewMode !== 'heat' || typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Création de la carte si non existante
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [5.36, -4.01],
          zoom: 11,
          zoomControl: false,
          attributionControl: false,
        });

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

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapInstanceRef.current = map;
        layersGroupRef.current = L.layerGroup().addTo(map);
      }

      const map = mapInstanceRef.current;
      const group = layersGroupRef.current;
      group.clearLayers();

      const bounds: [number, number][] = [];

      // Rendu des Hotspots avec taille et halo proportionnels au volume saisonnier
      zonePoints.forEach((zp) => {
        if (!zp.latitude || !zp.longitude) return;
        bounds.push([zp.latitude, zp.longitude]);

        const formatted = formatVolumeValue(zp.seasonalVolume, volumeUnit, zp.revenue);

        // 1. Halo extérieur thermique (Ambiance et diffusion)
        const outerHalo = L.circleMarker([zp.latitude, zp.longitude], {
          radius: zp.haloRadius,
          fillColor: zp.color,
          color: 'transparent',
          weight: 0,
          opacity: 0,
          fillOpacity: zp.tier === 'hot' ? 0.22 : 0.12,
          interactive: false,
        });
        group.addLayer(outerHalo);

        // 2. Halo intermédiaire (Intensité de concentration)
        const midHalo = L.circleMarker([zp.latitude, zp.longitude], {
          radius: Math.round(zp.coreRadius * 1.35),
          fillColor: zp.color,
          color: zp.color,
          weight: 1,
          opacity: 0.4,
          fillOpacity: zp.tier === 'hot' ? 0.45 : 0.26,
          interactive: false,
        });
        group.addLayer(midHalo);

        // 3. Cœur de la zone (Interactif avec infobulle)
        const coreBlob = L.circleMarker([zp.latitude, zp.longitude], {
          radius: zp.coreRadius,
          fillColor: zp.color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.85,
        });

        const tooltipHtml = `
          <div style="background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(12px); padding: 10px 14px; border-radius: 12px; border: 1px solid ${zp.color}70; color: #fff; font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 12px 30px rgba(0,0,0,0.85); min-width: 200px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <span style="font-weight: 700; font-size: 13px; color: #fff;">📍 ${zp.commune}</span>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: ${zp.color}25; color: ${zp.color}; border: 1px solid ${zp.color}50;">
                ${zp.badgeText}
              </span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
              Volume Saison (${formatted.unit}) : <b style="color: #fff; font-size: 13px;">${formatted.value.toLocaleString('fr-FR')} ${formatted.unit}</b>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Chiffre d'Affaires : <b style="color: #34d399;">${(zp.revenue / 1000000).toFixed(1)}M FCFA</b>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Établissements : <b style="color: #38bdf8;">${zp.posCount} POS</b> · Indice : <b>${zp.demandIndex}</b>
            </div>
            <div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">
              Région : ${zp.city} · ${zp.country}
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: ${zp.color}; font-weight: 600; text-align: center;">
              🎯 Cliquez pour filtrer la commune
            </div>
          </div>
        `;

        coreBlob.bindTooltip(tooltipHtml, {
          direction: 'top',
          offset: [0, -zp.coreRadius],
          opacity: 1,
          sticky: true,
        });

        coreBlob.on('click', () => {
          setSelectedZone(zp);
        });

        group.addLayer(coreBlob);

        // 4. Badge Flottant d'Intensité (sans mention de Snapchat)
        const badgeIcon = L.divIcon({
          className: 'zone-heat-marker',
          html: `
            <div style="transform: translate(-50%, -100%); margin-top: -${zp.coreRadius + 4}px; display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; background: rgba(15, 23, 42, 0.90); backdrop-filter: blur(8px); border: 1px solid ${zp.color}; box-shadow: 0 4px 14px ${zp.color}50; color: #fff; font-size: 10px; font-weight: 700; white-space: nowrap; pointer-events: none;">
              <span style="color: ${zp.color};">${zp.badgeText}</span>
              <span style="color: #cbd5e1; font-weight: 500;">• ${zp.commune}</span>
            </div>
          `,
          iconSize: [0, 0],
        });

        const badgeMarker = L.marker([zp.latitude, zp.longitude], {
          icon: badgeIcon,
          interactive: false,
        });
        group.addLayer(badgeMarker);
      });

      // Centrage automatique adaptatif pour englober tous les points des pays et filtres sélectionnés
      if (bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [viewMode, zonePoints, volumeUnit]);

  // Changement dynamique du fond de carte sans aucun filigrane
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return;

    const switchBasemap = async () => {
      const L = (await import('leaflet')).default;
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

      // Conserver les calques de données au premier plan
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

  // Redimensionnement fluide si on bascule sur la vue carte
  useEffect(() => {
    if (viewMode === 'heat' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }
  }, [viewMode]);

  const burningZonesCount = useMemo(() => {
    return zonePoints.filter((z) => z.intensity >= 75).length;
  }, [zonePoints]);

  const handleApplyZoneFilter = (communeName: string) => {
    store.setFilter('commune', communeName);
    setSelectedZone(null);
  };

  const handleQuickZoom = (lat: number, lng: number, zoom = 12) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 0.8 });
    }
  };

  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md overflow-hidden relative">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                <Flame className="size-4 text-orange-500 animate-pulse" />
                <span>Volume de Ventes par Zone / Commune</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-500 border-orange-500/30 gap-1 py-0 h-5">
                <Sparkles className="size-2.5" />
                <span>Intensité & Saisons</span>
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Taille des bulles proportionnelle aux volumes • {zonePoints.length} zones réparties selon vos filtres
            </CardDescription>
          </div>

          {/* Contrôles de Vue + Sélecteur d'Unité */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Switch de vue */}
            <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setViewMode('heat')}
                className={
                  'h-7 px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ' +
                  (viewMode === 'heat'
                    ? 'bg-orange-500 text-white shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted')
                }
              >
                <Flame className="size-3" />
                <span>Carte Thermique</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('bar')}
                className={
                  'h-7 px-2.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ' +
                  (viewMode === 'bar'
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted')
                }
              >
                <BarChart3 className="size-3" />
                <span>Histogramme</span>
              </button>
            </div>

            {/* Sélecteur d'unité local */}
            <div className="flex items-center bg-background/80 border border-border/80 p-0.5 rounded-lg">
              {VOLUME_UNIT_OPTIONS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => store.setVolumeUnit(u.id)}
                  className={
                    'h-7 px-2 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ' +
                    (volumeUnit === u.id
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 font-semibold'
                      : 'text-muted-foreground hover:text-foreground')
                  }
                  title={u.label}
                >
                  <span>{u.icon}</span>
                  <span className="hidden sm:inline">{u.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sélecteur de Saisons pour adapter la taille des volumes et les couleurs */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3.5 text-orange-500" />
            <span className="font-semibold text-foreground/80">Saison de Consommation :</span>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60 flex-wrap">
            {SEASONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSeason(s.id)}
                className={
                  'h-6 px-2 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ' +
                  (selectedSeason === s.id
                    ? 'bg-orange-500 text-white font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted')
                }
                title={s.description}
              >
                <span>{s.icon}</span>
                <span>{s.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative">
        {viewMode === 'heat' ? (
          <div className="relative w-full h-[385px] bg-slate-950">
            {/* Conteneur de la carte Leaflet */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Navigation rapide Focus pays / villes */}
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-lg text-[11px]">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold px-1.5 flex items-center gap-1">
                <Navigation className="size-3 text-orange-500" />
                Focus :
              </span>
              <button
                type="button"
                onClick={() => handleQuickZoom(5.35, -4.01, 12)}
                className="px-2 py-0.5 rounded-md hover:bg-muted/80 text-foreground transition-colors font-medium"
              >
                🇨🇮 Abidjan
              </button>
              <button
                type="button"
                onClick={() => handleQuickZoom(7.69, -5.03, 13)}
                className="px-2 py-0.5 rounded-md hover:bg-muted/80 text-foreground transition-colors font-medium"
              >
                📍 Bouaké
              </button>
              <button
                type="button"
                onClick={() => handleQuickZoom(5.21, -3.74, 13)}
                className="px-2 py-0.5 rounded-md hover:bg-muted/80 text-foreground transition-colors font-medium"
              >
                🏖️ Bassam
              </button>
              <button
                type="button"
                onClick={() => handleQuickZoom(12.37, -1.52, 12)}
                className="px-2 py-0.5 rounded-md hover:bg-muted/80 text-foreground transition-colors font-medium"
              >
                🇧🇫 Ouaga
              </button>
            </div>

            {/* Sélecteur de Relief (100% GRATUIT, SANS AUCUNE CLÉ API, SANS FILIGRANE) */}
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-0.5 bg-background/90 backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-xl text-[11px]">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold px-1.5 hidden sm:inline flex items-center gap-1">
                <Layers className="size-3 text-orange-500" />
                Relief :
              </span>
              {BASEMAP_STYLES.map((style) => {
                const isActive = activeBasemap === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setActiveBasemap(style.id)}
                    className={
                      'h-6 px-2 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ' +
                      (isActive
                        ? 'bg-orange-500 text-white font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70')
                    }
                    title={`${style.name} • ${style.description} (100% Gratuit sans clé API)`}
                  >
                    <span>{style.icon}</span>
                    <span className="hidden md:inline">{style.shortName}</span>
                  </button>
                );
              })}
            </div>

            {/* Indicateur de zones en forte demande */}
            {burningZonesCount > 0 && (
              <div className="absolute top-12 right-2.5 z-10 hidden sm:flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/40 backdrop-blur-md px-2.5 py-1 rounded-xl text-orange-400 text-[11px] font-semibold shadow-lg">
                <span className="size-2 rounded-full bg-orange-500 animate-ping" />
                <span>{burningZonesCount} zone{burningZonesCount > 1 ? 's' : ''} à très fort débit</span>
              </div>
            )}

            {/* Panneau Popover Détail Zone */}
            {selectedZone && (
              <div className="absolute bottom-12 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 z-20 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl p-3 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground">📍 {selectedZone.commune}</span>
                    <span className="text-xs text-muted-foreground">({selectedZone.city})</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${selectedZone.color}20`,
                      borderColor: `${selectedZone.color}60`,
                      color: selectedZone.color,
                    }}
                  >
                    {selectedZone.badgeText}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Volume {activeSeasonConfig.shortLabel} :</span>
                    <strong className="text-foreground font-mono">
                      {formatVolumeValue(selectedZone.seasonalVolume, volumeUnit, selectedZone.revenue).formatted}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Chiffre d'Affaires :</span>
                    <strong className="text-emerald-500 font-mono">
                      {(selectedZone.revenue / 1000000).toFixed(1)}M FCFA
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Établissements :</span>
                    <strong className="text-foreground">{selectedZone.posCount} maquis actifs</strong>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplyZoneFilter(selectedZone.commune)}
                    className="w-full h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium gap-1"
                  >
                    <Filter className="size-3" />
                    <span>Filtrer sur {selectedZone.commune}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedZone(null)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            {/* Échelle de gradient thermique (Intensité de Consommation) */}
            <div className="absolute bottom-2 left-2 right-2 z-10 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/70 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground shadow-md">
              <span className="font-semibold uppercase tracking-wider text-foreground/85 flex items-center gap-1">
                <Gauge className="size-3 text-orange-500" />
                Intensité des Ventes par Saison :
              </span>
              <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                <span className="text-[10px] text-cyan-400">❄️ 15° Calme</span>
                <div
                  className="h-2 flex-1 rounded-full border border-border/60"
                  style={{
                    background:
                      'linear-gradient(90deg, #06b6d4 0%, #10b981 25%, #eab308 50%, #f97316 75%, #ef4444 100%)',
                  }}
                />
                <span className="text-[10px] text-rose-500 font-bold">🔥 98° Élevé</span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground hidden md:inline">
                {zonePoints.length} zones réparties • Fond {BASEMAP_STYLES.find((b) => b.id === activeBasemap)?.name}
              </span>
            </div>
          </div>
        ) : (
          /* Vue Histogramme Recharts */
          <div className="p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                  <XAxis dataKey="commune" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card/95 backdrop-blur-xl p-3 shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-foreground flex items-center justify-between gap-2">
                              <span>📍 {d.commune} ({d.city})</span>
                              <span style={{ color: d.tempColor }} className="font-bold">
                                {d.intensity}°
                              </span>
                            </p>
                            <p className="text-orange-500 font-medium">
                              Volume Saison : <strong>{d.formattedVolume.toLocaleString('fr-FR')} {d.unitLabel}</strong>
                            </p>
                            <p className="text-muted-foreground">Points de vente : {d.posCount} établissements</p>
                            <p className="text-foreground">Indice Demande : {d.demandIndex} / 100</p>
                            <p className="text-emerald-500 font-semibold">Croissance : +{d.growthPercent}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="formattedVolume"
                    name={`Volume Saison (${VOLUME_UNIT_OPTIONS.find((o) => o.id === volumeUnit)?.shortLabel || 'Cols'})`}
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
