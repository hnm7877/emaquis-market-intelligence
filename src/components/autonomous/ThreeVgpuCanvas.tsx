'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Maximize2,
  RotateCcw,
  Activity,
  MapPin,
  TrendingUp,
  Layers,
  Store,
  Beer,
  DollarSign,
  Globe2,
  Calendar,
  Sun,
  CloudRain,
  PartyPopper,
  BarChart3,
  Check,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveZoneCoordinates } from '@/constants/coordinates';
import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';
import { anonymizeEstablishmentName } from '@/utils/anonymize';
import 'leaflet/dist/leaflet.css';
import { escapeHtml } from '@/lib/security/escapeHtml';
import { useBourseUiStore } from '@/stores/useBourseUiStore';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { ZoneMesh3D, type MeshZone } from './ZoneMesh3D';
import { ZoneInsightPanel } from './ZoneInsightPanel';

export interface RealHub {
  name: string;
  share: string;
  volume?: number;
  revenue?: number;
  posCount?: number;
}

interface ZoneData {
  id?: string;
  zone: string;
  city: string;
  country?: string;
  volume: number;
  revenue: number;
  posCount: number;
  latitude: number;
  longitude: number;
  growth?: number | null;
  demandIndex?: number | null;
  seasonalVolumes?: {
    festive?: number;
    dry?: number;
    rainy?: number;
  };
}

interface ThreeVgpuCanvasProps {
  activeNode?: string;
  onNodeSelect?: (nodeName: string) => void;
  intensity?: number;
  realHubs?: RealHub[];
  geoData?: any;
  unit?: DisplayVolumeUnit;
}

type ViewMode = 'map' | 'ranking' | 'seasonality' | 'mesh3d';
type MetricMode = 'volume' | 'revenue' | 'pos';


export const ThreeVgpuCanvas: React.FC<ThreeVgpuCanvasProps> = ({
  activeNode = 'Yopougon',
  onNodeSelect,
  intensity = 1.0,
  realHubs,
  geoData,
  unit = 'cols',
}) => {
  // Préférences mémorisées (store Zustand partagé avec la page)
  const viewMode = useBourseUiStore((s) => s.mapView);
  const setViewMode = useBourseUiStore((s) => s.setMapView);
  const metricMode = useBourseUiStore((s) => s.mapMetric);
  const setMetricMode = useBourseUiStore((s) => s.setMapMetric);
  const showPins = useBourseUiStore((s) => s.showPins);
  const togglePins = useBourseUiStore((s) => s.togglePins);
  const lastPulse = useMarketRealtimeStore((s) => s.lastPulse);
  const [liveByZone, setLiveByZone] = useState<Record<string, { sales: number; amount: number }>>({});

  // Références Leaflet
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);
  const pulseGroupRef = useRef<any>(null);
  const hasInitializedCameraRef = useRef(false);
  const [isRotating, setIsRotating] = useState(true);

  // Extraction et consolidation des zones réelles
  const resolvedZones: ZoneData[] = useMemo(() => {
    const rawZones: any[] = geoData?.zones || [];
    if (!rawZones.length) return [];

    return rawZones.map((z, idx) => {
      let lat = Number(z.latitude);
      let lng = Number(z.longitude);

      if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0) {
        const resolved = resolveZoneCoordinates(z.zone, z.city, z.country, idx);
        lat = resolved.latitude;
        lng = resolved.longitude;
      }

      return {
        id: z.id || `zone-${idx}`,
        zone: z.zone || 'Commune Inconnue',
        city: z.city || '',
        country: z.country || '',
        volume: Number(z.volume) || 0,
        revenue: Number(z.revenue) || 0,
        posCount: Number(z.posCount) || 0,
        latitude: lat,
        longitude: lng,
        growth: z.growth ?? null,
        demandIndex: z.demandIndex ?? null,
        // Saisons calculées par l'API uniquement (aucune répartition supposée)
        seasonalVolumes: z.seasonalVolumes || { festive: 0, dry: 0, rainy: 0 },
      };
    }).sort((a, b) => b.volume - a.volume);
  }, [geoData]);

  // Établissements réels anonymisés
  const establishments = useMemo(() => {
    return (geoData?.establishments || []).filter(
      (e: any) => e.latitude && e.longitude && !isNaN(e.latitude) && !isNaN(e.longitude)
    );
  }, [geoData]);

  // Totaux consolidés
  const totalVolume = useMemo(() => resolvedZones.reduce((s, z) => s + z.volume, 0), [resolvedZones]);
  const totalRevenue = useMemo(() => resolvedZones.reduce((s, z) => s + z.revenue, 0), [resolvedZones]);
  const totalPos = useMemo(() => resolvedZones.reduce((s, z) => s + z.posCount, 0), [resolvedZones]);

  // Saisonnalités consolidées
  const seasonalStats = useMemo(() => {
    let festive = 0;
    let dry = 0;
    let rainy = 0;

    resolvedZones.forEach((z) => {
      festive += z.seasonalVolumes?.festive || 0;
      dry += z.seasonalVolumes?.dry || 0;
      rainy += z.seasonalVolumes?.rainy || 0;
    });

    const sum = festive + dry + rainy || 1;
    return {
      festive: { volume: festive, share: Math.round((festive / sum) * 1000) / 10 },
      dry: { volume: dry, share: Math.round((dry / sum) * 1000) / 10 },
      rainy: { volume: rainy, share: Math.round((rainy / sum) * 1000) / 10 },
    };
  }, [resolvedZones]);

  // Top hubs territoriaux (communes réelles)
  const dynamicHubs = useMemo(() => {
    if (!resolvedZones.length) return [];
    return resolvedZones.slice(0, 5).map((z) => ({
      name: z.zone,
      share: totalVolume > 0 ? `${Math.round((z.volume / totalVolume) * 1000) / 10}%` : '0%',
      volume: z.volume,
      revenue: z.revenue,
      posCount: z.posCount,
      latitude: z.latitude,
      longitude: z.longitude,
    }));
  }, [resolvedZones, totalVolume]);

  // ==========================================
  // RENDU CARTE LEAFLET INTERACTIVE (STABLE & SANS FLASH)
  // ==========================================
  const renderLeafletLayers = useCallback(
    (L: any, map: any, group: any) => {
      group.clearLayers();

      // 1. Cercles interactifs des communes
      resolvedZones.forEach((z) => {
        const lat = z.latitude;
        const lng = z.longitude;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

        let radius = 14;
        let color = '#10b981';
        let formattedValue = '';

        if (metricMode === 'volume') {
          radius = Math.max(12, Math.min(26, Math.sqrt(z.volume) * 0.055));
          color = z.volume > 50000 ? '#10b981' : z.volume > 15000 ? '#f59e0b' : '#06b6d4';
          formattedValue = formatProductVolume(z.volume, unit, z.zone).formatted;
        } else if (metricMode === 'revenue') {
          radius = Math.max(12, Math.min(26, Math.sqrt(z.revenue) * 0.0022));
          color = '#8b5cf6';
          formattedValue = `${(z.revenue / 1000000).toFixed(1)}M FCFA`;
        } else {
          radius = Math.max(12, Math.min(26, Math.sqrt(z.posCount) * 1.3));
          color = '#06b6d4';
          formattedValue = `${z.posCount} POS`;
        }

        const isSelected = activeNode?.toLowerCase() === z.zone.toLowerCase();

        // Halo lumineux discret
        const halo = L.circleMarker([lat, lng], {
          radius: radius * 1.5,
          fillColor: color,
          color: 'transparent',
          weight: 0,
          fillOpacity: isSelected ? 0.35 : 0.14,
          interactive: false,
        });
        halo.addTo(group);

        // Cercle principal
        const circle = L.circleMarker([lat, lng], {
          radius,
          fillColor: color,
          color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
          weight: isSelected ? 2.5 : 1.2,
          opacity: 1,
          fillOpacity: isSelected ? 0.88 : 0.7,
        });

        // Tooltip interactif riche
        const shareOfTotal = totalVolume > 0 ? ((z.volume / totalVolume) * 100).toFixed(1) : '0';
        circle.bindTooltip(
          `
          <div style="background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(12px); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.18); color: #fff; font-family: system-ui, sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.6); min-width: 190px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: 700; font-size: 13px; color: #f8fafc;">📍 ${escapeHtml(z.zone)}</span>
              <span style="font-size: 10px; background: rgba(245,158,11,0.2); color: #f59e0b; padding: 1px 6px; border-radius: 4px; font-weight: 700;">${shareOfTotal}%</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">${escapeHtml(z.city)} · ${escapeHtml(z.country)}</div>
            <div style="font-size: 11px; color: #38bdf8; font-weight: 600;">📦 Volume : ${formatProductVolume(z.volume, unit, z.zone).formatted}</div>
            <div style="font-size: 11px; color: #34d399; font-weight: 600;">💰 CA : ${(z.revenue / 1000000).toFixed(2)}M FCFA</div>
            <div style="font-size: 11px; color: #fbbf24; font-weight: 600;">🏪 Maquis actifs : ${z.posCount} POS anonymisés</div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #38bdf8; font-weight: 600;">
              👉 Cliquez pour zoomer sur ${escapeHtml(z.zone)}
            </div>
          </div>
          `,
          { direction: 'top', offset: [0, -radius], opacity: 1, sticky: true }
        );

        circle.on('click', () => {
          onNodeSelect?.(z.zone);
          map.setView([lat, lng], 13, { animate: true });
        });

        circle.addTo(group);

        // Badge texte épuré (une seule ligne, sans pavé noir opaque)
        const textIcon = L.divIcon({
          className: 'zone-text-badge',
          html: `
            <div style="transform: translate(-50%, -50%); display: flex; align-items: center; pointer-events: none;">
              <span style="background: rgba(15, 23, 42, 0.9); color: ${isSelected ? '#38bdf8' : '#f8fafc'}; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; border: 1px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.22)'}; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">
                ${escapeHtml(z.zone)}
              </span>
            </div>
          `,
          iconSize: [0, 0],
        });

        L.marker([lat, lng], { icon: textIcon }).addTo(group);
      });

      // 2. Pins des établissements individuels (ANONYMISÉS 100%)
      if (showPins && establishments.length > 0) {
        establishments.slice(0, 80).forEach((est: any, idx: number) => {
          if (!est.latitude || !est.longitude) return;

          const anonName = anonymizeEstablishmentName(est.name, est.id, idx);

          const estIcon = L.divIcon({
            className: 'custom-est-pin',
            html: `
              <div style="width: 12px; height: 12px; background: #090d16; border: 1.5px solid ${
                est.hasDirectGps ? '#10b981' : '#f59e0b'
              }; border-radius: 50%; box-shadow: 0 0 5px ${
                est.hasDirectGps ? 'rgba(16,185,129,0.7)' : 'rgba(245,158,11,0.5)'
              };"></div>
            `,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });

          const estMarker = L.marker([est.latitude, est.longitude], { icon: estIcon });

          estMarker.bindTooltip(
            `
            <div style="background: rgba(15, 23, 42, 0.95); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 11px;">
              <div style="font-weight: 700; color: #38bdf8;">🏪 ${escapeHtml(anonName)}</div>
              <div style="color: #94a3b8; font-size: 10px;">${escapeHtml(est.zone)} · ${escapeHtml(est.city)}</div>
              <div style="color: #10b981; font-weight: 600; margin-top: 2px;">${(Number(est.volume) || 0).toLocaleString('fr-FR')} cols</div>
            </div>
            `,
            { direction: 'top', offset: [0, -6], opacity: 1 }
          );

          estMarker.addTo(group);
        });
      }
    },
    [resolvedZones, establishments, metricMode, showPins, activeNode, totalVolume, unit, onNodeSelect]
  );

  // Initialisation Leaflet : créée une seule fois pour éviter tout flash/rechargement de tuiles
  useEffect(() => {
    if (viewMode !== 'map') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layersGroupRef.current = null;
        pulseGroupRef.current = null;
        hasInitializedCameraRef.current = false;
      }
      return;
    }

    // Si la carte existe déjà, on ne la recrée surtout pas
    if (mapInstanceRef.current) return;

    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = await import('leaflet');
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      // Centre fixe par défaut sur Abidjan
      const map = L.map(mapContainerRef.current, {
        center: [5.348, -4.015],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Fond de carte sombre Esri Dark Canvas
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 16 }
      ).addTo(map);

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 16, opacity: 0.85 }
      ).addTo(map);

      const group = L.layerGroup().addTo(map);
      layersGroupRef.current = group;
      pulseGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Rendu initial des calques
      renderLeafletLayers(L, map, group);
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [viewMode]);

  // Redimensionnement automatique sans clignotement
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [viewMode]);

  // Recalcul en place des calques vectoriels sans reset de carte (ZÉRO flash, fluide)
  useEffect(() => {
    if (viewMode === 'map' && mapInstanceRef.current && layersGroupRef.current) {
      import('leaflet').then((L) => {
        if (mapInstanceRef.current && layersGroupRef.current) {
          renderLeafletLayers(L, mapInstanceRef.current, layersGroupRef.current);
          // Premier affichage avec de vraies données : cadrage sur toutes les communes
          if (!hasInitializedCameraRef.current && geoData?.zones?.length) {
            const pts = resolvedZones.filter((z) => z.latitude && z.longitude).map((z) => [z.latitude, z.longitude] as [number, number]);
            if (pts.length > 1) mapInstanceRef.current.fitBounds(pts, { padding: [30, 30], maxZoom: 13 });
            hasInitializedCameraRef.current = true;
          }
        }
      });
    }
  }, [viewMode, renderLeafletLayers]);

  // Ventes en direct (résumé WebSocket toutes les 3 s) : onde sur la commune + cumul par commune
  useEffect(() => {
    if (!lastPulse?.zones?.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cumul des résumés reçus en direct
    setLiveByZone((prev) => {
      const next = { ...prev };
      for (const pz of lastPulse.zones) {
        const k = String(pz.commune || pz.city || '').toLowerCase();
        if (!k) continue;
        const cur = next[k] || { sales: 0, amount: 0 };
        next[k] = { sales: cur.sales + (pz.sales || 0), amount: cur.amount + (pz.amount || 0) };
      }
      return next;
    });
    const map = mapInstanceRef.current;
    const group = pulseGroupRef.current;
    if (viewMode !== 'map' || !map || !group) return;
    import('leaflet').then((L) => {
      for (const pz of lastPulse.zones.slice(0, 20)) {
        const z = resolvedZones.find(
          (r) => r.zone.toLowerCase() === String(pz.commune || '').toLowerCase() || (!pz.commune && r.city.toLowerCase() === String(pz.city || '').toLowerCase()),
        );
        if (!z?.latitude || !z?.longitude) continue;
        const marker = L.marker([z.latitude, z.longitude], {
          interactive: false,
          icon: L.divIcon({ className: 'mi-live-ping', html: '<span></span><span></span>', iconSize: [0, 0] }),
        }).addTo(group);
        setTimeout(() => group.removeLayer(marker), 2600);
      }
    });
  }, [lastPulse, viewMode, resolvedZones]);

  // Colonnes de la vue 3D selon la métrique choisie
  const meshZones: MeshZone[] = useMemo(
    () =>
      resolvedZones
        .filter((z) => z.latitude && z.longitude)
        .slice(0, 60)
        .map((z) => ({
          zone: z.zone,
          city: z.city,
          latitude: z.latitude,
          longitude: z.longitude,
          value: metricMode === 'revenue' ? z.revenue : metricMode === 'pos' ? z.posCount : z.volume,
          label:
            metricMode === 'revenue'
              ? `${(z.revenue / 1000000).toFixed(1)}M FCFA`
              : metricMode === 'pos'
              ? `${z.posCount} maquis`
              : formatProductVolume(z.volume, unit, z.zone).formatted,
        })),
    [resolvedZones, metricMode, unit],
  );

  // Recentrage sur toutes les zones du périmètre (Abidjan seulement s'il n'y a aucune zone)
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const pts = resolvedZones.filter((z) => z.latitude && z.longitude).map((z) => [z.latitude, z.longitude] as [number, number]);
      if (pts.length > 1) mapInstanceRef.current.fitBounds(pts, { padding: [30, 30], maxZoom: 13, animate: true });
      else if (pts.length === 1) mapInstanceRef.current.setView(pts[0], 12, { animate: true });
      else mapInstanceRef.current.setView([5.348, -4.015], 12, { animate: true });
    }
  };

  // Clic sur un hub : sélection et déplacement fluide
  const handleSelectHub = (hubName: string) => {
    onNodeSelect?.(hubName);
    if (mapInstanceRef.current) {
      const found = resolvedZones.find((z) => z.zone.toLowerCase() === hubName.toLowerCase());
      if (found && found.latitude && found.longitude) {
        mapInstanceRef.current.setView([found.latitude, found.longitude], 13, { animate: true });
      }
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border/80 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-4 shadow-2xl flex flex-col justify-between min-h-[460px]">
      {/* Grille de fond subtile */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(56,189,248,0.08),transparent_75%)] pointer-events-none" />

      {/* 1. TOP HEADER HUD AVEC TABS DE VUE ET MÉTRIQUES */}
      <div className="relative z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Compass className="size-3.5" />
            Intelligence Territoriale Live
          </span>
          <Badge variant="outline" className="text-[10px] bg-slate-800/80 text-cyan-300 border-cyan-500/30 font-mono">
            {resolvedZones.length} Communes
          </Badge>
        </div>

        {/* Boutons de sélection du mode de vue */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <Button
            size="sm"
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            onClick={() => setViewMode('map')}
            className={`h-7 px-2.5 text-xs gap-1 font-mono ${
              viewMode === 'map' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="size-3.5" />
            Carte
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'ranking' ? 'default' : 'ghost'}
            onClick={() => setViewMode('ranking')}
            className={`h-7 px-2.5 text-xs gap-1 font-mono ${
              viewMode === 'ranking' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="size-3.5" />
            Top Communes
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'seasonality' ? 'default' : 'ghost'}
            onClick={() => setViewMode('seasonality')}
            className={`h-7 px-2.5 text-xs gap-1 font-mono ${
              viewMode === 'seasonality' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Consommation par saisons (Fêtes, Sèche, Pluies)"
          >
            <Calendar className="size-3.5" />
            Saisons
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'mesh3d' ? 'default' : 'ghost'}
            onClick={() => setViewMode('mesh3d')}
            className={`h-7 px-2.5 text-xs gap-1 font-mono ${
              viewMode === 'mesh3d' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vue 3D Orbitale Three.js"
          >
            <Globe2 className="size-3.5" />
            3D Mesh
          </Button>
        </div>
      </div>

      {/* 2. ZONE PRINCIPALE DE VISUALISATION (SELON ONGLET ACTIF) */}
      <div className="relative z-10 my-3 flex-1 min-h-[310px] rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950/80">
        {/* MODE A : CARTE GÉOGRAPHIQUE RÉELLE LEAFLET */}
        {viewMode === 'map' && (
          <div className="relative w-full h-[320px]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Barre de contrôle flottante sur la carte */}
            <div className="absolute top-2.5 left-2.5 z-[500] flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-md">
              <span className="text-[10px] font-mono text-slate-400 px-1.5">Métrique :</span>
              <button
                onClick={() => setMetricMode('volume')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
                  metricMode === 'volume' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => setMetricMode('revenue')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
                  metricMode === 'revenue' ? 'bg-purple-500/20 text-purple-400 font-bold border border-purple-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CA (FCFA)
              </button>
              <button
                onClick={() => setMetricMode('pos')}
                className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
                  metricMode === 'pos' ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Maquis
              </button>

              <div className="h-3 w-px bg-slate-800 mx-1" />

              <button
                onClick={togglePins}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${
                  showPins ? 'text-emerald-400' : 'text-slate-500'
                }`}
                title="Afficher/masquer les débits individuels anonymisés"
              >
                <Layers className="size-3" />
                <span>{showPins ? 'Pins ON' : 'Pins OFF'}</span>
              </button>

              <button
                onClick={handleRecenter}
                className="text-[10px] font-mono p-1 rounded text-slate-400 hover:text-white"
                title="Voir toutes les communes"
              >
                <Maximize2 className="size-3" />
              </button>
            </div>

            {/* Mini Légende d'aide à la lecture */}
            <div className="absolute bottom-2.5 left-2.5 z-[500] bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span>Forte consommation (&gt; 50k cols)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" />
                <span>Consommation modérée (15k-50k cols)</span>
              </div>
            </div>
          </div>
        )}

        {/* MODE B : CLASSEMENT TOP COMMUNES ET PÔLES */}
        {viewMode === 'ranking' && (
          <div className="w-full h-[320px] p-3 overflow-y-auto space-y-2">
            <div className="text-xs font-mono text-slate-400 flex items-center justify-between pb-1 border-b border-slate-800">
              <span>Commune / Zone</span>
              <span>Volume & Part Réseau</span>
            </div>
            {resolvedZones.map((z, idx) => {
              const share = totalVolume > 0 ? (z.volume / totalVolume) * 100 : 0;
              const isSelected = activeNode?.toLowerCase() === z.zone.toLowerCase();

              return (
                <div
                  key={z.zone}
                  onClick={() => onNodeSelect?.(z.zone)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        <span>{z.zone}</span>
                        <span className="text-[10px] font-normal text-slate-400">({z.city})</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {z.posCount} débits • {(z.revenue / 1000000).toFixed(1)}M FCFA
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-cyan-300">
                      {formatProductVolume(z.volume, unit, z.zone).formatted}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">{share.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE C : SAISONNALITÉ ET MÉTÉO DES VENTES */}
        {viewMode === 'seasonality' && (
          <div className="w-full h-[320px] p-4 flex flex-col justify-between overflow-y-auto space-y-3">
            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5 text-amber-400" />
                Dynamique Saisonnier du Réseau Boisson
              </span>
              <p className="text-[11px] text-slate-400">
                Calculé d'après les mois de vente réels des tickets de caisse consolidés en base de données.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Carte Fêtes */}
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <PartyPopper className="size-3.5" />
                    Période Festive
                  </span>
                  <Badge className="bg-rose-500/20 text-rose-300 text-[10px] font-mono">
                    {seasonalStats.festive.share}%
                  </Badge>
                </div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatProductVolume(seasonalStats.festive.volume, unit, 'Fêtes').formatted}
                </div>
                <div className="text-[10px] text-slate-400">
                  Novembre, Décembre, Janvier • Réveillons, forte consommation festive.
                </div>
              </div>

              {/* Carte Saison Sèche */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Sun className="size-3.5" />
                    Saison Sèche
                  </span>
                  <Badge className="bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                    {seasonalStats.dry.share}%
                  </Badge>
                </div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatProductVolume(seasonalStats.dry.volume, unit, 'Sèche').formatted}
                </div>
                <div className="text-[10px] text-slate-400">
                  Février à Mai • Chaleur intense, volume désaltérant continu.
                </div>
              </div>

              {/* Carte Saison des Pluies */}
              <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    <CloudRain className="size-3.5" />
                    Saison des Pluies
                  </span>
                  <Badge className="bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                    {seasonalStats.rainy.share}%
                  </Badge>
                </div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatProductVolume(seasonalStats.rainy.volume, unit, 'Pluies').formatted}
                </div>
                <div className="text-[10px] text-slate-400">
                  Juin à Octobre • Consommation de repli dans les maquis abrités.
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Volume Total Réseau Analysé :</span>
              <strong className="text-cyan-300">{formatProductVolume(totalVolume, unit, 'Total').formatted}</strong>
            </div>
          </div>
        )}

        {/* MODE D : VUE 3D THREE.JS (colonnes par commune) */}
        {viewMode === 'mesh3d' && (
          <div className="relative w-full h-[320px]">
            <ZoneMesh3D
              zones={meshZones}
              activeZone={activeNode}
              autoRotate={isRotating}
              color={metricMode === 'revenue' ? '#8b5cf6' : metricMode === 'pos' ? '#06b6d4' : '#f59e0b'}
              onSelect={(name) => onNodeSelect?.(name)}
            />
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800">
              {(['volume', 'revenue', 'pos'] as MetricMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetricMode(m)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${metricMode === m ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {m === 'volume' ? 'Volume' : m === 'revenue' ? 'CA' : 'Maquis'}
                </button>
              ))}
              <div className="h-3 w-px bg-slate-800 mx-0.5" />
              <button
                onClick={() => setIsRotating(!isRotating)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded text-slate-400 hover:text-white flex items-center gap-1"
                title={isRotating ? 'Arrêter la rotation' : 'Rotation automatique'}
              >
                <RotateCcw className={`size-3 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                {isRotating ? 'Rotation' : 'Fixe'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fiche de la commune choisie + opportunités pour les grossistes */}
      <ZoneInsightPanel zones={resolvedZones} activeZone={activeNode} unit={unit} liveByZone={liveByZone} onSelect={handleSelectHub} />

      {/* 3. HUBS DE SÉLECTION RAPIDE DES COMMUNES EN BAS */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md rounded-xl px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <Sparkles className="size-3.5 text-orange-400" />
          <span>Hubs Territoriaux :</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {dynamicHubs.map((hub, i) => {
            const isSelected = activeNode?.toLowerCase() === hub.name.toLowerCase();
            const colorClass =
              i === 0
                ? 'border-orange-500/40 text-orange-400 bg-orange-500/10'
                : i === 1
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : i === 2
                ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
                : 'border-purple-500/40 text-purple-400 bg-purple-500/10';

            return (
              <button
                key={hub.name}
                onClick={() => handleSelectHub(hub.name)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-all hover:scale-105 ${colorClass} ${
                  isSelected ? 'ring-2 ring-orange-400 ring-offset-1 ring-offset-slate-950 font-bold' : ''
                }`}
              >
                {hub.name} <span className="opacity-75">({hub.share})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
