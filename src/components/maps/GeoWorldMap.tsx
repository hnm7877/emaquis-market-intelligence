'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Maximize2, Minimize2, Scan } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { escapeHtml } from '@/lib/security/escapeHtml';
import { anonymizeEstablishmentName } from '@/utils/anonymize';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { PAYS, normalizeCountry } from '@/constants/countries';

export type GeoMetric = 'volume' | 'revenue' | 'pos' | 'growth';

export interface MapZone {
  id: string;
  zone: string;
  city: string;
  country: string;
  volume: number;
  revenue?: number;
  posCount: number;
  growth: number | null;
  demandIndex?: number | null;
  latitude: number;
  longitude: number;
}

export interface MapEstablishment {
  id: string;
  name: string;
  zone: string;
  city: string;
  latitude: number;
  longitude: number;
  hasDirectGps?: boolean;
  volume: number;
  revenue: number;
}

interface Props {
  zones: MapZone[];
  establishments: MapEstablishment[];
  metric: GeoMetric;
  selectedZoneId?: string | null;
  focusCountry?: string | null;
  onSelectZone?: (zone: MapZone) => void;
  onSelectCountry?: (country: string) => void;
}

const BASEMAPS = [
  {
    id: 'dark',
    label: 'Sombre',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  },
  { id: 'satellite', label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'streets', label: 'Rues', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' },
] as const;

/** Niveau de détail selon le zoom : pays → communes → maquis */
const levelFor = (zoom: number) => (zoom < 6 ? 'country' : zoom < 12 ? 'commune' : 'establishment');

const flagOf = (country: string) => PAYS.find((p) => p.code === normalizeCountry(country))?.flag || '🌍';

const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (v >= 10_000) return `${(n / 1_000).toFixed(1)} k`;
  return Math.round(n).toLocaleString('fr-FR');
};

const metricValue = (z: { volume: number; revenue?: number; posCount: number; growth?: number | null }, m: GeoMetric) =>
  m === 'revenue' ? z.revenue || 0 : m === 'pos' ? z.posCount : m === 'growth' ? z.growth ?? 0 : z.volume;

const metricLabel = (v: number, m: GeoMetric) =>
  m === 'revenue' ? `${compact(v)} F` : m === 'pos' ? `${compact(v)} maquis` : m === 'growth' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)} %` : compact(v);

/** Couleur : ambre pour les quantités, vert / rouge pour l'évolution */
const colorFor = (z: MapZone, m: GeoMetric) => {
  if (m === 'growth') {
    if (z.growth == null) return '#64748b';
    return z.growth >= 10 ? '#10b981' : z.growth >= 0 ? '#84cc16' : z.growth > -10 ? '#f97316' : '#f43f5e';
  }
  return m === 'revenue' ? '#a78bfa' : m === 'pos' ? '#22d3ee' : '#f59e0b';
};

/**
 * Grande carte tous pays : bulles par pays vues de loin, communes en zoomant, puis maquis
 * (anonymisés). Ondes à chaque vente reçue en direct. Tous les textes sont échappés.
 */
export function GeoWorldMap({ zones, establishments, metric, selectedZoneId, focusCountry, onSelectZone, onSelectCountry }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const dataLayer = useRef<any>(null);
  const pulseLayer = useRef<any>(null);
  const baseLayers = useRef<any[]>([]);
  const fitted = useRef(false);
  const [zoom, setZoom] = useState(3);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<(typeof BASEMAPS)[number]['id']>('dark');
  const [fullscreen, setFullscreen] = useState(false);
  const lastPulse = useMarketRealtimeStore((s) => s.lastPulse);
  const handlers = useRef({ onSelectZone, onSelectCountry });
  useEffect(() => {
    handlers.current = { onSelectZone, onSelectCountry };
  }, [onSelectZone, onSelectCountry]);

  const located = useMemo(() => zones.filter((z) => Number.isFinite(z.latitude) && Number.isFinite(z.longitude) && (z.latitude || z.longitude)), [zones]);

  // Agrégat par pays (centre pondéré par le volume)
  const countries = useMemo(() => {
    const m = new Map<string, { country: string; volume: number; revenue: number; posCount: number; lat: number; lng: number; w: number; zones: MapZone[]; growthSum: number; growthW: number }>();
    for (const z of located) {
      const c = m.get(z.country) || { country: z.country, volume: 0, revenue: 0, posCount: 0, lat: 0, lng: 0, w: 0, zones: [], growthSum: 0, growthW: 0 };
      const w = Math.max(z.volume, 1);
      c.volume += z.volume;
      c.revenue += z.revenue || 0;
      c.posCount += z.posCount;
      c.lat += z.latitude * w;
      c.lng += z.longitude * w;
      c.w += w;
      if (z.growth != null) {
        c.growthSum += z.growth * w;
        c.growthW += w;
      }
      c.zones.push(z);
      m.set(z.country, c);
    }
    return [...m.values()].map((c) => ({ ...c, lat: c.lat / c.w, lng: c.lng / c.w, growth: c.growthW ? c.growthSum / c.growthW : null }));
  }, [located]);

  const fitTo = useCallback((pts: [number, number][], maxZoom = 13) => {
    const map = mapRef.current;
    if (!map || !pts.length) return;
    if (pts.length === 1) map.flyTo(pts[0], Math.min(maxZoom, 12), { duration: 0.8 });
    else map.flyToBounds(pts, { padding: [40, 40], maxZoom, duration: 0.8 });
  }, []);

  // Création unique de la carte
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !hostRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(hostRef.current, { center: [8, 0], zoom: 3, minZoom: 2, zoomControl: false, attributionControl: false, worldCopyJump: true });
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      dataLayer.current = L.layerGroup().addTo(map);
      pulseLayer.current = L.layerGroup().addTo(map);
      map.on('zoomend', () => setZoom(map.getZoom()));
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Fond de carte
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    baseLayers.current.forEach((l) => map.removeLayer(l));
    const b = BASEMAPS.find((x) => x.id === basemap)!;
    const layers = [L.tileLayer(b.url, { maxZoom: 19 })];
    if ('labels' in b && b.labels) layers.push(L.tileLayer(b.labels, { maxZoom: 19, opacity: 0.85 }));
    layers.forEach((l) => l.addTo(map).bringToBack());
    baseLayers.current = layers;
  }, [ready, basemap]);

  // Premier cadrage : tous les pays d'un coup
  useEffect(() => {
    if (!ready || fitted.current || !located.length) return;
    fitted.current = true;
    mapRef.current.fitBounds(located.map((z) => [z.latitude, z.longitude]), { padding: [40, 40], maxZoom: 7 });
    setZoom(mapRef.current.getZoom());
  }, [ready, located]);

  // Pays choisi depuis la page
  useEffect(() => {
    if (!ready || !focusCountry) return;
    const c = countries.find((x) => x.country === focusCountry);
    if (c) fitTo(c.zones.map((z) => [z.latitude, z.longitude]), 12);
  }, [ready, focusCountry, countries, fitTo]);

  // Commune choisie depuis la page (tableau, recherche)
  useEffect(() => {
    if (!ready || !selectedZoneId) return;
    const z = located.find((x) => x.id === selectedZoneId);
    if (z && mapRef.current.getZoom() < 9) mapRef.current.flyTo([z.latitude, z.longitude], 12, { duration: 0.8 });
  }, [ready, selectedZoneId, located]);

  const level = levelFor(zoom);

  // Calques de données (recalculés au changement de niveau, de métrique ou de données)
  useEffect(() => {
    const L = LRef.current;
    const group = dataLayer.current;
    if (!ready || !L || !group) return;
    group.clearLayers();

    const bubble = (lat: number, lng: number, size: number, color: string, label: string, sub: string, tip: string, selected: boolean, delay: number, onClick: () => void) => {
      const icon = L.divIcon({
        className: 'mi-geo-bubble',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        html: `<div class="mi-geo-dot${selected ? ' is-selected' : ''}" style="--c:${color};--d:${delay}ms;width:${size}px;height:${size}px"></div>${
          label ? `<div class="mi-geo-label" style="--d:${delay}ms"><b>${label}</b><span>${sub}</span></div>` : ''
        }`,
      });
      const mk = L.marker([lat, lng], { icon, riseOnHover: true });
      mk.bindTooltip(tip, { direction: 'top', offset: [0, -size / 2], opacity: 1, className: 'mi-geo-tip' });
      mk.on('click', onClick);
      mk.addTo(group);
    };

    if (level === 'country') {
      const max = Math.max(...countries.map((c) => Math.abs(metricValue(c, metric))), 1);
      countries.forEach((c, i) => {
        const v = metricValue(c, metric);
        const size = 34 + Math.sqrt(Math.abs(v) / max) * 62;
        const color = metric === 'growth' ? colorFor({ growth: c.growth } as MapZone, metric) : colorFor({} as MapZone, metric);
        const name = escapeHtml(c.country);
        bubble(
          c.lat,
          c.lng,
          size,
          color,
          `${flagOf(c.country)} ${name}`,
          metric === 'growth' && c.growth == null ? 'n/d' : escapeHtml(metricLabel(v, metric)),
          `<div class="mi-tip"><b>${flagOf(c.country)} ${name}</b><div>${c.zones.length} communes · ${c.posCount.toLocaleString('fr-FR')} maquis</div><div>Volume : ${compact(c.volume)}</div><div>CA : ${compact(c.revenue)} F</div><em>Cliquez pour zoomer</em></div>`,
          false,
          i * 60,
          () => {
            handlers.current.onSelectCountry?.(c.country);
            fitTo(c.zones.map((z) => [z.latitude, z.longitude]), 12);
          },
        );
      });
      return;
    }

    const max = Math.max(...located.map((z) => Math.abs(metricValue(z, metric))), 1);
    const sorted = [...located].sort((a, b) => Math.abs(metricValue(b, metric)) - Math.abs(metricValue(a, metric)));
    sorted.forEach((z, i) => {
      const v = metricValue(z, metric);
      const size = (level === 'establishment' ? 16 : 14) + Math.sqrt(Math.abs(v) / max) * 40;
      const name = escapeHtml(z.zone);
      const showLabel = i < 25 || z.id === selectedZoneId;
      const growth = z.growth == null ? 'n/d' : `${z.growth >= 0 ? '+' : ''}${z.growth.toFixed(1)} %`;
      bubble(
        z.latitude,
        z.longitude,
        size,
        colorFor(z, metric),
        showLabel ? name : '',
        metric === 'growth' && z.growth == null ? 'n/d' : escapeHtml(metricLabel(v, metric)),
        `<div class="mi-tip"><b>${name}</b><div>${escapeHtml(z.city)} · ${flagOf(z.country)} ${escapeHtml(z.country)}</div><div>Volume : ${compact(z.volume)}</div><div>CA : ${compact(z.revenue || 0)} F</div><div>${z.posCount.toLocaleString('fr-FR')} maquis · évolution ${growth}</div></div>`,
        z.id === selectedZoneId,
        Math.min(i, 30) * 25,
        () => {
          handlers.current.onSelectZone?.(z);
          if (mapRef.current.getZoom() < 12) mapRef.current.flyTo([z.latitude, z.longitude], 13, { duration: 0.7 });
        },
      );
    });

    if (level === 'establishment') {
      establishments.slice(0, 500).forEach((e, i) => {
        if (!Number.isFinite(e.latitude) || !Number.isFinite(e.longitude)) return;
        const icon = L.divIcon({
          className: 'mi-geo-bubble',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
          html: `<div class="mi-geo-pin${e.hasDirectGps ? ' is-gps' : ''}" style="--d:${Math.min(i, 60) * 10}ms"></div>`,
        });
        const name = escapeHtml(anonymizeEstablishmentName(e.name, e.id, i));
        L.marker([e.latitude, e.longitude], { icon })
          .bindTooltip(
            `<div class="mi-tip"><b>${name}</b><div>${escapeHtml(e.zone)} · ${escapeHtml(e.city)}</div><div>${compact(e.volume)} unités · ${compact(e.revenue)} F</div><div>${e.hasDirectGps ? 'Position GPS' : 'Position par adresse'}</div></div>`,
            { direction: 'top', opacity: 1, className: 'mi-geo-tip' },
          )
          .addTo(group);
      });
    }
  }, [ready, level, metric, countries, located, establishments, selectedZoneId, fitTo]);

  // Ondes des ventes reçues en direct (résumé WebSocket toutes les 3 s)
  useEffect(() => {
    const L = LRef.current;
    const group = pulseLayer.current;
    if (!ready || !L || !group || !lastPulse?.zones?.length) return;
    for (const pz of lastPulse.zones.slice(0, 25)) {
      const commune = String(pz.commune || '').toLowerCase();
      const city = String(pz.city || '').toLowerCase();
      const z = located.find((r) => r.zone.toLowerCase() === commune) || located.find((r) => r.city.toLowerCase() === city);
      if (!z) continue;
      const mk = L.marker([z.latitude, z.longitude], {
        interactive: false,
        icon: L.divIcon({ className: 'mi-live-ping', html: '<span></span><span></span>', iconSize: [0, 0] }),
      }).addTo(group);
      setTimeout(() => group.removeLayer(mk), 2600);
    }
  }, [ready, lastPulse, located]);

  // Plein écran
  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === wrapRef.current);
      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={wrapRef} className="relative h-[68vh] min-h-[460px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div ref={hostRef} className="absolute inset-0" />

      {/* Commandes */}
      <div className="absolute right-3 top-3 z-[500] flex items-center gap-1.5">
        <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-950/90 p-0.5 backdrop-blur">
          <Layers className="mx-1.5 size-3.5 text-slate-400" />
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBasemap(b.id)}
              className={`rounded-md px-2 py-1 text-[11px] transition-colors ${basemap === b.id ? 'bg-amber-500 font-semibold text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fitTo(located.map((z) => [z.latitude, z.longitude]), 7)}
          className="rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 text-slate-300 backdrop-blur transition-colors hover:text-white"
          title="Voir tous les pays"
          aria-label="Voir tous les pays"
        >
          <Scan className="size-3.5" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 text-slate-300 backdrop-blur transition-colors hover:text-white"
          title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          aria-label="Plein écran"
        >
          {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </div>

      {/* Niveau de détail */}
      <div className="absolute left-3 top-3 z-[500] hidden items-center gap-1 rounded-lg sm:flex border border-slate-700/80 bg-slate-950/90 p-1 text-[11px] backdrop-blur">
        {(['country', 'commune', 'establishment'] as const).map((l, i) => (
          <span key={l} className={`rounded-md px-2 py-0.5 transition-colors ${level === l ? 'bg-amber-500/20 font-semibold text-amber-300' : 'text-slate-500'}`}>
            {i + 1}. {l === 'country' ? 'Pays' : l === 'commune' ? 'Communes' : 'Maquis'}
          </span>
        ))}
      </div>

      {/* Légende */}
      <div className="absolute bottom-3 left-3 z-[500] hidden max-w-[260px] sm:block rounded-lg border border-slate-700/80 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300 backdrop-blur">
        {metric === 'growth' ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {[
              ['#10b981', '≥ +10 %'],
              ['#84cc16', '0 à +10 %'],
              ['#f97316', '0 à −10 %'],
              ['#f43f5e', '< −10 %'],
              ['#64748b', 'n/d'],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        ) : (
          <div>Taille de la bulle = {metric === 'revenue' ? "chiffre d'affaires" : metric === 'pos' ? 'nombre de maquis' : 'volume vendu'}</div>
        )}
        <div className="mt-1 text-slate-500">Zoomez pour passer des pays aux communes puis aux maquis · onde ambre = vente en direct</div>
      </div>

      {!ready && <div className="absolute inset-0 z-[400] animate-pulse bg-slate-900/60" />}
      {ready && !located.length && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center text-xs text-slate-400">Aucune zone localisée pour ces filtres.</div>
      )}
    </div>
  );
}
