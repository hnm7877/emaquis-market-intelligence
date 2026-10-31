'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MlMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, ChevronLeft, ChevronRight, Globe2, Layers, Maximize2, Minimize2, Scan, Store } from 'lucide-react';
import { anonymizeEstablishmentName } from '@/utils/anonymize';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { PAYS, normalizeCountry, flagToIso } from '@/constants/countries';
import { circlePolygon, type LngLat } from '@/lib/geo';

export type GeoMetric = 'volume' | 'revenue' | 'pos' | 'growth';
export type GeoTool = 'explore' | 'heat' | 'white' | 'depot' | 'route' | 'timeline';

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
  hourly?: number[];
  registeredPos?: number;
}

export interface MapEstablishment {
  id: string;
  name: string;
  zone: string;
  city: string;
  latitude: number;
  longitude: number;
  hasDirectGps?: boolean;
  country?: string;
  volume: number;
  revenue: number;
  /** Comptes distributeurs : tranches à la place des valeurs exactes */
  revenueRange?: string;
  volumeRange?: string;
}

/** Niveau d'immersion : pays → ville → commune (les maquis du niveau sont affichés) */
export interface Drill {
  country: string;
  city?: string;
  commune?: string;
}

export interface MapWhiteZone {
  id: string;
  zone: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  registeredPos: number;
}

interface Props {
  zones: MapZone[];
  establishments: MapEstablishment[];
  whiteZones?: MapWhiteZone[];
  metric: GeoMetric;
  tool: GeoTool;
  /** Heure affichée par la carte de chaleur (0 → 23) */
  hour?: number;
  /** Avant / après : 0 = période précédente, 1 = période en cours */
  blend?: number;
  depot?: LngLat | null;
  depotRadii?: number[];
  route?: LngLat[];
  routeIds?: string[];
  selectedZoneId?: string | null;
  focusCountry?: string | null;
  /** Point à centrer (liste d'un outil) */
  focusPoint?: { latitude: number; longitude: number } | null;
  onSelectZone?: (zone: MapZone) => void;
  onSelectCountry?: (country: string) => void;
  onMapClick?: (lngLat: LngLat) => void;
}

/**
 * Fonds gratuits, sans clé et sans filigrane :
 * - OpenFreeMap (tuiles vectorielles OpenStreetMap, usage libre et illimité) ;
 * - imagerie Esri World Imagery limitée à son zoom réel (au-delà, MapLibre agrandit
 *   la dernière image au lieu d'afficher « Map data not yet available »).
 */
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const SATELLITE: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    sat: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 17,
      attribution: '© Esri',
    },
  },
  layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
};
const BASEMAPS: { id: string; label: string; style: string | StyleSpecification }[] = [
  { id: 'dark', label: 'Sombre', style: 'https://tiles.openfreemap.org/styles/dark' },
  { id: 'light', label: 'Clair', style: 'https://tiles.openfreemap.org/styles/positron' },
  { id: 'streets', label: 'Rues', style: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'satellite', label: 'Satellite', style: SATELLITE },
];
const FONT = ['Noto Sans Regular'];

/** Code ISO du pays (CI, BF…) : les drapeaux emoji ne s'affichent pas sous Windows */
const flagOf = (country: string) => {
  const p = PAYS.find((x) => x.code === normalizeCountry(country));
  return p ? flagToIso(p.flag) : '';
};
const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (v >= 10_000) return `${(n / 1_000).toFixed(1)} k`;
  return Math.round(n).toLocaleString('fr-FR');
};
const growthColor = (g: number | null) => (g == null ? '#64748b' : g >= 10 ? '#10b981' : g >= 0 ? '#84cc16' : g > -10 ? '#f97316' : '#f43f5e');
const metricColor = (m: GeoMetric) => (m === 'revenue' ? '#a78bfa' : m === 'pos' ? '#22d3ee' : '#f59e0b');

/** Valeur d'une zone, avec le curseur avant / après (période précédente estimée par l'évolution) */
function valueOf(z: { volume: number; revenue?: number; posCount: number; growth: number | null }, m: GeoMetric, blend: number) {
  const factor = z.growth == null || z.growth <= -100 ? 1 : 1 / (1 + z.growth / 100) + (1 - 1 / (1 + z.growth / 100)) * blend;
  if (m === 'growth') return z.growth ?? 0;
  if (m === 'pos') return z.posCount;
  return (m === 'revenue' ? z.revenue || 0 : z.volume) * factor;
}
const labelOf = (v: number, m: GeoMetric, g: number | null) =>
  m === 'growth' ? (g == null ? 'n/d' : `${g >= 0 ? '+' : ''}${g.toFixed(1)} %`) : m === 'revenue' ? `${compact(v)} F` : m === 'pos' ? `${compact(v)} maquis` : compact(v);

/** Rayon selon le zoom (le zoom doit être au premier niveau de l'expression), × facteur d'apparition */
const zoomRadius = (g = 1) =>
  ['interpolate', ['linear'], ['zoom'], 4, ['*', ['get', 'r'], 0.6 * g], 9, ['*', ['get', 'r'], g], 14, ['*', ['get', 'r'], 1.35 * g]] as unknown as number;

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const pt = (lng: number, lat: number, properties: Record<string, unknown>): GeoJSON.Feature => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates: [lng, lat] },
});

/** Fiche au survol, construite en texte (aucun HTML injecté) */
function tipNode(title: string, lines: string[], hint?: string) {
  const root = document.createElement('div');
  root.className = 'mi-tip';
  const b = document.createElement('b');
  b.textContent = title;
  root.appendChild(b);
  for (const l of lines) {
    const d = document.createElement('div');
    d.textContent = l;
    root.appendChild(d);
  }
  if (hint) {
    const e = document.createElement('em');
    e.textContent = hint;
    root.appendChild(e);
  }
  return root;
}

/**
 * Grande carte tous pays (MapLibre GL, libre et gratuite) : pays vus de loin, communes en
 * zoomant, maquis anonymisés de près ; carte de chaleur horaire, zones blanches, dépôt et
 * rayons, tournée, avant / après ; ondes des ventes reçues en direct.
 */
export function GeoWorldMap(props: Props) {
  const {
    zones,
    establishments,
    whiteZones = [],
    metric,
    tool,
    hour = 21,
    blend = 1,
    depot,
    depotRadii = [5, 10, 20],
    route = [],
    routeIds = [],
    selectedZoneId,
    focusCountry,
  } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const fitted = useRef(false);
  const grow = useRef(1);
  const [styleReady, setStyleReady] = useState(0);
  const [basemap, setBasemap] = useState('dark');
  const [fullscreen, setFullscreen] = useState(false);
  const [tilted, setTilted] = useState(false);
  const lastPulse = useMarketRealtimeStore((s) => s.lastPulse);
  const cb = useRef(props);
  useEffect(() => {
    cb.current = props;
  });

  const located = useMemo(() => zones.filter((z) => Number.isFinite(z.latitude) && Number.isFinite(z.longitude) && (z.latitude || z.longitude)), [zones]);

  // Agrégat par pays (centre pondéré par le volume)
  const countries = useMemo(() => {
    const m = new Map<string, { country: string; volume: number; revenue: number; posCount: number; lat: number; lng: number; w: number; n: number; gs: number; gw: number }>();
    for (const z of located) {
      const c = m.get(z.country) || { country: z.country, volume: 0, revenue: 0, posCount: 0, lat: 0, lng: 0, w: 0, n: 0, gs: 0, gw: 0 };
      const w = Math.max(z.volume, 1);
      c.volume += z.volume;
      c.revenue += z.revenue || 0;
      c.posCount += z.posCount;
      c.lat += z.latitude * w;
      c.lng += z.longitude * w;
      c.w += w;
      c.n += 1;
      if (z.growth != null) {
        c.gs += z.growth * w;
        c.gw += w;
      }
      m.set(z.country, c);
    }
    return [...m.values()].map((c) => ({ ...c, lat: c.lat / c.w, lng: c.lng / c.w, growth: c.gw ? c.gs / c.gw : null }));
  }, [located]);

  const [layersVersion, setLayersVersion] = useState(0);
  const countriesRef = useRef(countries);
  useEffect(() => {
    countriesRef.current = countries;
  }, [countries]);

  // ---------- Immersion : pays → ville → commune, cadrage sur toutes ses communes et maquis ----------
  const [drill, setDrill] = useState<Drill | null>(null);
  const inDrill = useCallback((d: Drill, z: { country?: string; city?: string; zone?: string }, zoneCountry?: string) => {
    const country = z.country || zoneCountry;
    if (country && country !== d.country) return false;
    if (d.city && String(z.city || '').toLowerCase() !== d.city.toLowerCase()) return false;
    if (d.commune && String(z.zone || '').toLowerCase() !== d.commune.toLowerCase()) return false;
    return true;
  }, []);
  // Pays d'un maquis : le sien, sinon celui de sa commune
  const zoneCountry = useMemo(() => new Map(zones.map((z) => [`${z.zone}|${z.city}`, z.country])), [zones]);
  const estCountry = useCallback((e: MapEstablishment) => e.country || zoneCountry.get(`${e.zone}|${e.city}`), [zoneCountry]);

  const immerse = useCallback(
    (d: Drill | null) => {
      setDrill(d);
      const map = mapRef.current;
      if (!map) return;
      if (!d) return;
      const zs = cb.current.zones.filter((z) => Number.isFinite(z.latitude) && inDrill(d, z));
      const es = cb.current.establishments.filter((e) => Number.isFinite(e.latitude) && inDrill(d, e, estCountry(e)));
      const b = new maplibregl.LngLatBounds();
      zs.forEach((z) => b.extend([z.longitude, z.latitude]));
      es.forEach((e) => b.extend([e.longitude, e.latitude]));
      if (b.isEmpty()) return;
      const maxZoom = d.commune ? 15.5 : d.city ? 14 : 13;
      map.fitBounds(b, { padding: { top: 70, bottom: 50, left: 290, right: 60 }, maxZoom, duration: 1400, essential: true, pitch: d.commune ? 40 : 0 });
    },
    [inDrill, estCountry],
  );
  const flyToCountry = useCallback((country: string) => immerse({ country }), [immerse]);
  const immerseRef = useRef(immerse);
  useEffect(() => {
    immerseRef.current = immerse;
  }, [immerse]);

  const handlersBound = useRef(false);

  // ---------- Données GeoJSON ----------
  const zoneData = useMemo<GeoJSON.FeatureCollection>(() => {
    const vals = located.map((z) => Math.abs(valueOf(z, metric, blend)));
    const max = Math.max(...vals, 1);
    const sorted = [...located].sort((a, b) => Math.abs(valueOf(b, metric, blend)) - Math.abs(valueOf(a, metric, blend)));
    const rank = new Map(sorted.map((z, i) => [z.id, i]));
    const hourMax = Math.max(...located.map((z) => z.hourly?.[hour] || 0), 1);
    const routeSet = new Set(routeIds);
    return {
      type: 'FeatureCollection',
      features: located.map((z) => {
        const v = valueOf(z, metric, blend);
        return pt(z.longitude, z.latitude, {
          id: z.id,
          r: 7 + Math.sqrt(Math.abs(v) / max) * 30,
          color: metric === 'growth' ? growthColor(z.growth) : metricColor(metric),
          label: z.zone,
          value: labelOf(v, metric, z.growth),
          rank: rank.get(z.id) ?? 999,
          heat: (z.hourly?.[hour] || 0) / hourMax,
          selected: z.id === selectedZoneId ? 1 : 0,
          inRoute: routeSet.has(z.id) ? 1 : 0,
        });
      }),
    };
  }, [located, metric, blend, hour, selectedZoneId, routeIds]);

  const countryData = useMemo<GeoJSON.FeatureCollection>(() => {
    const max = Math.max(...countries.map((c) => Math.abs(valueOf(c, metric, blend))), 1);
    return {
      type: 'FeatureCollection',
      features: countries.map((c) => {
        const v = valueOf(c, metric, blend);
        return pt(c.lng, c.lat, {
          country: c.country,
          r: 16 + Math.sqrt(Math.abs(v) / max) * 34,
          color: metric === 'growth' ? growthColor(c.growth) : metricColor(metric),
          label: c.country,
          value: labelOf(v, metric, c.growth),
        });
      }),
    };
  }, [countries, metric, blend]);

  const estData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: establishments
        .slice(0, 500)
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => Number.isFinite(e.latitude) && Number.isFinite(e.longitude) && (!drill || inDrill(drill, e, estCountry(e))))
        .map(({ e, i }) => pt(e.longitude, e.latitude, { i, gps: e.hasDirectGps ? 1 : 0 })),
    }),
    [establishments, drill, inDrill, estCountry],
  );

  const whiteData = useMemo<GeoJSON.FeatureCollection>(() => {
    const max = Math.max(...whiteZones.map((w) => w.registeredPos), 1);
    return {
      type: 'FeatureCollection',
      features: whiteZones.map((w, i) => pt(w.longitude, w.latitude, { i, r: 8 + Math.sqrt(w.registeredPos / max) * 22, label: w.zone, value: `${w.registeredPos} inscrit${w.registeredPos > 1 ? 's' : ''}` })),
    };
  }, [whiteZones]);

  const depotData = useMemo<GeoJSON.FeatureCollection>(
    () => (depot ? { type: 'FeatureCollection', features: [...[...depotRadii].sort((a, b) => b - a).map((km) => circlePolygon(depot, km)), pt(depot[0], depot[1], { depot: 1 })] } : EMPTY),
    [depot, depotRadii],
  );

  const routeData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: [
        ...(route.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } } as GeoJSON.Feature] : []),
        ...route.slice(depot ? 1 : 0).map((c, i) => pt(c[0], c[1], { n: String(i + 1) })),
      ],
    }),
    [route, depot],
  );

  // ---------- Création de la carte ----------
  useEffect(() => {
    if (!hostRef.current) return;
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: BASEMAPS[0].style,
      center: [2, 8],
      zoom: 3,
      minZoom: 1.5,
      maxZoom: 19,
      attributionControl: { compact: true },
      dragRotate: true,
      pitchWithRotate: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    map.on('style.load', () => setStyleReady((n) => n + 1));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---------- Couches (recréées après chaque changement de fond) ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const src = (id: string, data: GeoJSON.FeatureCollection) => {
      if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data });
    };
    src('mi-zones', EMPTY);
    src('mi-countries', EMPTY);
    src('mi-est', EMPTY);
    src('mi-white', EMPTY);
    src('mi-depot', EMPTY);
    src('mi-route', EMPTY);
    const add = (layer: maplibregl.LayerSpecification) => {
      if (!map.getLayer(layer.id)) map.addLayer(layer);
    };

    add({ id: 'mi-depot-fill', type: 'fill', source: 'mi-depot', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.035 } });
    add({ id: 'mi-depot-line', type: 'line', source: 'mi-depot', filter: ['==', '$type', 'Polygon'], paint: { 'line-color': '#f59e0b', 'line-width': 1.5, 'line-dasharray': [2, 2] } });
    add({
      id: 'mi-heat',
      type: 'heatmap',
      source: 'mi-zones',
      paint: {
        'heatmap-weight': ['get', 'heat'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 1, 12, 3],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 25, 12, 60],
        'heatmap-opacity': 0.85,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.2, '#7c2d12', 0.45, '#ea580c', 0.7, '#f59e0b', 1, '#fef3c7'],
      },
    });
    add({
      id: 'mi-white-circle',
      type: 'circle',
      source: 'mi-white',
      paint: { 'circle-radius': zoomRadius(), 'circle-color': 'rgba(148,163,184,0.12)', 'circle-stroke-color': '#cbd5e1', 'circle-stroke-width': 1.5 },
    });
    add({
      id: 'mi-countries-circle',
      type: 'circle',
      source: 'mi-countries',
      maxzoom: 5.2,
      paint: {
        'circle-radius': ['get', 'r'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.85,
        'circle-stroke-color': '#020617',
        'circle-stroke-width': 2,
        'circle-blur': 0.05,
      },
    });
    add({
      id: 'mi-zones-circle',
      type: 'circle',
      source: 'mi-zones',
      minzoom: 5.2,
      paint: {
        'circle-radius': zoomRadius(),
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.82,
        'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#ffffff', ['==', ['get', 'inRoute'], 1], '#fde68a', '#020617'],
        'circle-stroke-width': ['case', ['any', ['==', ['get', 'selected'], 1], ['==', ['get', 'inRoute'], 1]], 3, 1.5],
      },
    });
    add({
      id: 'mi-est-circle',
      type: 'circle',
      source: 'mi-est',
      minzoom: 11.5,
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 12, 5, 16, 8], 'circle-color': '#0b1220', 'circle-stroke-width': 2, 'circle-stroke-color': ['case', ['==', ['get', 'gps'], 1], '#10b981', '#f59e0b'] },
    });
    add({ id: 'mi-route-line', type: 'line', source: 'mi-route', filter: ['==', '$type', 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fde68a', 'line-width': 3, 'line-dasharray': [1, 1.6] } });
    add({ id: 'mi-route-stop', type: 'circle', source: 'mi-route', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 10, 'circle-color': '#fde68a', 'circle-stroke-color': '#020617', 'circle-stroke-width': 2 } });
    add({ id: 'mi-route-num', type: 'symbol', source: 'mi-route', filter: ['==', '$type', 'Point'], layout: { 'text-field': ['get', 'n'], 'text-font': FONT, 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#020617' } });
    add({ id: 'mi-depot-pin', type: 'circle', source: 'mi-depot', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 9, 'circle-color': '#020617', 'circle-stroke-color': '#f59e0b', 'circle-stroke-width': 4 } });

    const label = (id: string, source: string, extra: Partial<maplibregl.SymbolLayerSpecification> = {}) =>
      add({
        id,
        type: 'symbol',
        source,
        layout: {
          'text-field': ['format', ['get', 'label'], { 'font-scale': 1 }, '\n', {}, ['get', 'value'], { 'font-scale': 0.85, 'text-color': '#fcd34d' }],
          'text-font': FONT,
          'text-size': 12,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-optional': true,
          ...(extra.layout || {}),
        },
        paint: { 'text-color': '#f8fafc', 'text-halo-color': '#020617', 'text-halo-width': 1.6, ...(extra.paint || {}) },
        ...(extra.minzoom != null ? { minzoom: extra.minzoom } : {}),
        ...(extra.maxzoom != null ? { maxzoom: extra.maxzoom } : {}),
      } as maplibregl.LayerSpecification);
    label('mi-countries-label', 'mi-countries', { maxzoom: 5.2, layout: { 'text-size': 13 } as never });
    label('mi-zones-label', 'mi-zones', { minzoom: 5.2, layout: { 'symbol-sort-key': ['get', 'rank'] } as never });
    label('mi-white-label', 'mi-white', { paint: { 'text-color': '#cbd5e1' } as never });

    setLayersVersion((n) => n + 1);
    // Survol et clics : enregistrés une seule fois (ils survivent aux changements de fond)
    if (handlersBound.current) return;
    handlersBound.current = true;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'mi-geo-popup', maxWidth: '260px' });
    const hover = (layer: string, build: (p: Record<string, unknown>) => HTMLElement | null) => {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
      map.on('mousemove', layer, (e) => {
        const f = e.features?.[0];
        const node = f && build(f.properties as Record<string, unknown>);
        if (node) popup.setLngLat(e.lngLat).setDOMContent(node).addTo(map);
      });
    };
    const zoneById = (id: unknown) => cb.current.zones.find((z) => z.id === id);
    hover('mi-zones-circle', (p) => {
      const z = zoneById(p.id);
      if (!z) return null;
      return tipNode(
        z.zone,
        [
          `${z.city} · ${flagOf(z.country)} ${z.country}`,
          `Volume : ${compact(z.volume)} · CA : ${compact(z.revenue || 0)} F`,
          `${z.posCount.toLocaleString('fr-FR')} maquis actifs${z.registeredPos ? ` sur ${z.registeredPos} inscrits` : ''}`,
          `Évolution : ${z.growth == null ? 'n/d' : `${z.growth >= 0 ? '+' : ''}${z.growth.toFixed(1)} %`}`,
        ],
        cb.current.tool === 'route' ? 'Clic : ajouter / retirer de la tournée' : 'Clic : fiche de la commune',
      );
    });
    hover('mi-countries-circle', (p) => {
      const c = countriesRef.current.find((x) => x.country === p.country);
      if (!c) return null;
      return tipNode(`${flagOf(c.country)} ${c.country}`, [`${c.n} communes · ${c.posCount.toLocaleString('fr-FR')} maquis`, `Volume : ${compact(c.volume)}`, `CA : ${compact(c.revenue)} F`], 'Clic : zoomer sur ce pays');
    });
    hover('mi-white-circle', (p) => {
      const w = cb.current.whiteZones?.[Number(p.i)];
      if (!w) return null;
      return tipNode(w.zone, [`${w.city} · ${w.country}`, `${w.registeredPos} établissement(s) inscrit(s), aucune vente sur la période`], 'Zone à prospecter');
    });
    hover('mi-est-circle', (p) => {
      const e = cb.current.establishments[Number(p.i)];
      if (!e) return null;
      return tipNode(anonymizeEstablishmentName(e.name, e.id, Number(p.i)), [`${e.zone} · ${e.city}`, e.revenueRange ? `${e.volumeRange ?? ''} unités · ${e.revenueRange}` : `${compact(e.volume)} unités · ${compact(e.revenue)} F`, e.hasDirectGps ? 'Position GPS' : 'Position par adresse']);
    });

    map.on('click', 'mi-countries-circle', (e) => {
      const country = e.features?.[0]?.properties?.country as string | undefined;
      if (!country) return;
      cb.current.onSelectCountry?.(country);
      immerseRef.current({ country });
    });
    map.on('click', 'mi-zones-circle', (e) => {
      const z = zoneById(e.features?.[0]?.properties?.id);
      if (!z) return;
      cb.current.onSelectZone?.(z);
      // Immersion dans la commune : cadrage sur tous ses maquis
      if (cb.current.tool === 'explore' || cb.current.tool === 'heat' || cb.current.tool === 'timeline') immerseRef.current({ country: z.country, city: z.city, commune: z.zone });
    });
    // Clic sur un maquis : fiche épinglée
    map.on('click', 'mi-est-circle', (e) => {
      const i = Number(e.features?.[0]?.properties?.i);
      const est = cb.current.establishments[i];
      if (!est) return;
      new maplibregl.Popup({ offset: 10, className: 'mi-geo-popup', maxWidth: '260px' })
        .setLngLat([est.longitude, est.latitude])
        .setDOMContent(
          tipNode(anonymizeEstablishmentName(est.name, est.id, i), [
            `${est.zone} · ${est.city}`,
            est.volumeRange ? `Volume : ${est.volumeRange} unités` : `Volume : ${compact(est.volume)} unités`,
            est.revenueRange ? `CA : ${est.revenueRange}` : `CA : ${compact(est.revenue)} F`,
            est.hasDirectGps ? 'Position GPS (légèrement décalée pour l\u2019anonymat)' : 'Position par adresse déclarée',
          ]),
        )
        .addTo(map);
    });
    map.on('click', (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ['mi-zones-circle', 'mi-countries-circle', 'mi-est-circle'].filter((l) => map.getLayer(l)) });
      if (!hit.length) cb.current.onMapClick?.([e.lngLat.lng, e.lngLat.lat]);
    });
  }, [styleReady]);

  // ---------- Mise à jour des données (sans recréer les couches) ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersVersion) return;
    const set = (id: string, data: GeoJSON.FeatureCollection) => (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    set('mi-zones', zoneData);
    set('mi-countries', countryData);
    set('mi-est', estData);
    set('mi-white', tool === 'white' ? whiteData : EMPTY);
    set('mi-depot', depotData);
    set('mi-route', routeData);
  }, [layersVersion, zoneData, countryData, estData, whiteData, depotData, routeData, tool]);

  // Visibilité selon l'outil
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersVersion) return;
    const vis = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    const heat = tool === 'heat';
    vis('mi-heat', heat);
    ['mi-zones-circle', 'mi-countries-circle'].forEach((l) => map.getLayer(l) && map.setPaintProperty(l, 'circle-opacity', heat ? 0.25 : 0.82));
    vis('mi-white-circle', tool === 'white');
    vis('mi-white-label', tool === 'white');
  }, [layersVersion, tool]);

  // Apparition animée des bulles (taille 0 → 1) à chaque changement de vue
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersVersion) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 650);
      grow.current = 1 - Math.pow(1 - k, 3);
      if (map.getLayer('mi-zones-circle')) map.setPaintProperty('mi-zones-circle', 'circle-radius', zoomRadius(Math.max(grow.current, 0.001)));
      if (map.getLayer('mi-countries-circle')) map.setPaintProperty('mi-countries-circle', 'circle-radius', ['*', ['get', 'r'], grow.current]);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [layersVersion, metric]);

  // Premier cadrage : tous les pays d'un coup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersVersion || fitted.current || !located.length) return;
    fitted.current = true;
    const b = new maplibregl.LngLatBounds();
    located.forEach((z) => b.extend([z.longitude, z.latitude]));
    map.fitBounds(b, { padding: 70, maxZoom: 6, duration: 0 });
  }, [layersVersion, located]);

  // Pays choisi depuis la page (pastilles) : immersion dans ce pays ; « Tous » : retour au monde
  useEffect(() => {
    if (!layersVersion) return;
    /* eslint-disable react-hooks/set-state-in-effect -- le filtre pays de la page pilote l'immersion */
    if (focusCountry) flyToCountry(focusCountry);
    else setDrill(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [focusCountry, layersVersion, flyToCountry]);

  // En immersion, les maquis apparaissent dès le niveau ville
  useEffect(() => {
    const map = mapRef.current;
    if (map && layersVersion && map.getLayer('mi-est-circle')) map.setLayerZoomRange('mi-est-circle', drill ? 6.5 : 11.5, 24);
  }, [drill, layersVersion]);

  // Détail du niveau d'immersion (villes du pays, communes de la ville, maquis de la commune)
  const drillInfo = useMemo(() => {
    if (!drill) return null;
    const zs = located.filter((z) => inDrill(drill, z));
    const es = establishments.filter((e) => inDrill(drill, e, estCountry(e)));
    const group = (key: (z: MapZone) => string) => {
      const m = new Map<string, { name: string; volume: number; pos: number }>();
      zs.forEach((z) => {
        const k = key(z);
        const c = m.get(k) || { name: k, volume: 0, pos: 0 };
        c.volume += z.volume;
        c.pos += z.posCount;
        m.set(k, c);
      });
      return [...m.values()].sort((a, b) => b.volume - a.volume);
    };
    return {
      items: drill.commune ? [] : drill.city ? group((z) => z.zone) : group((z) => z.city),
      volume: zs.reduce((s, z) => s + z.volume, 0),
      revenue: zs.reduce((s, z) => s + (z.revenue || 0), 0),
      pos: zs.reduce((s, z) => s + z.posCount, 0),
      placed: es.length,
      communes: zs.length,
    };
  }, [drill, located, establishments, inDrill, estCountry]);

  useEffect(() => {
    const map = mapRef.current;
    const z = located.find((x) => x.id === selectedZoneId);
    // En immersion, le cadrage est déjà fait sur les maquis de la commune
    if (map && z && tool !== 'route' && !drill?.commune && map.getZoom() < 9) map.flyTo({ center: [z.longitude, z.latitude], zoom: 11.5, duration: 900 });
  }, [selectedZoneId, located, tool, drill]);

  useEffect(() => {
    const map = mapRef.current;
    const f = props.focusPoint;
    if (map && f && Number.isFinite(f.latitude)) map.flyTo({ center: [f.longitude, f.latitude], zoom: Math.max(map.getZoom(), 11.5), duration: 900 });
  }, [props.focusPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && depot) map.flyTo({ center: depot, zoom: Math.max(map.getZoom(), 10), duration: 800 });
  }, [depot]);

  // Ondes des ventes reçues en direct (résumé WebSocket toutes les 3 s)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lastPulse?.zones?.length) return;
    const markers: maplibregl.Marker[] = [];
    for (const pz of lastPulse.zones.slice(0, 25)) {
      const commune = String(pz.commune || '').toLowerCase();
      const city = String(pz.city || '').toLowerCase();
      const z = located.find((r) => r.zone.toLowerCase() === commune) || located.find((r) => r.city.toLowerCase() === city);
      if (!z) continue;
      const el = document.createElement('div');
      el.className = 'mi-live-ping';
      el.innerHTML = '<span></span><span></span>';
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([z.longitude, z.latitude]).addTo(map));
    }
    const t = setTimeout(() => markers.forEach((m) => m.remove()), 2600);
    return () => {
      clearTimeout(t);
      markers.forEach((m) => m.remove());
    };
  }, [lastPulse, located]);

  // Fond de carte
  const changeBasemap = (id: string) => {
    const b = BASEMAPS.find((x) => x.id === id);
    if (!b || !mapRef.current || id === basemap) return;
    setBasemap(id);
    mapRef.current.setStyle(b.style);
  };

  // Plein écran (le conteneur entier, pour garder les commandes)
  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === wrapRef.current);
      setTimeout(() => mapRef.current?.resize(), 120);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleTilt = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: tilted ? 0 : 55, bearing: tilted ? 0 : -15, duration: 800 });
    setTilted(!tilted);
  };

  const fitAll = () => {
    const map = mapRef.current;
    if (!map || !located.length) return;
    const b = new maplibregl.LngLatBounds();
    located.forEach((z) => b.extend([z.longitude, z.latitude]));
    map.fitBounds(b, { padding: 70, maxZoom: 6, duration: 1000 });
  };

  const btn = 'rounded-lg border border-slate-700/80 bg-slate-950/90 p-2 text-slate-300 backdrop-blur transition-colors hover:text-white';

  return (
    <div ref={wrapRef} className={`relative h-[72vh] min-h-[480px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 ${tool === 'depot' ? 'mi-cursor-crosshair' : ''}`}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />

      <div className="absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-1.5">
        <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-950/90 p-0.5 backdrop-blur">
          <Layers className="mx-1.5 hidden size-3.5 text-slate-400 sm:block" />
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              onClick={() => changeBasemap(b.id)}
              className={`rounded-md px-2 py-1 text-[11px] transition-colors ${basemap === b.id ? 'bg-amber-500 font-semibold text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <button onClick={toggleTilt} className={`${btn} ${tilted ? 'text-amber-300' : ''}`} title="Vue inclinée 3D" aria-label="Vue inclinée 3D">
          <Box className="size-3.5" />
        </button>
        <button onClick={fitAll} className={btn} title="Voir tous les pays" aria-label="Voir tous les pays">
          <Scan className="size-3.5" />
        </button>
        <button
          onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void wrapRef.current?.requestFullscreen?.())}
          className={btn}
          title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          aria-label="Plein écran"
        >
          {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </div>

      {props.metric === 'growth' && tool !== 'heat' && (
        <div className="absolute bottom-3 left-3 z-10 hidden flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-700/80 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300 backdrop-blur sm:flex">
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
      )}

      {/* Panneau d'immersion */}
      {drill && drillInfo && (
        <div className="absolute left-3 top-14 z-10 w-[260px] max-w-[calc(100%-24px)] rounded-xl border border-slate-700/80 bg-slate-950/92 p-3 text-white shadow-2xl backdrop-blur sm:top-3">
          <nav className="flex flex-wrap items-center gap-1 text-[11px]" aria-label="Niveau d'immersion">
            <button onClick={() => { setDrill(null); cb.current.onSelectCountry?.(''); fitAll(); }} className="flex items-center gap-1 text-slate-400 hover:text-white">
              <Globe2 className="size-3" /> Monde
            </button>
            <ChevronRight className="size-3 text-slate-600" />
            <button onClick={() => immerse({ country: drill.country })} className={drill.city ? 'text-slate-400 hover:text-white' : 'font-semibold text-amber-300'}>
              {flagOf(drill.country)} {drill.country}
            </button>
            {drill.city && (
              <>
                <ChevronRight className="size-3 text-slate-600" />
                <button onClick={() => immerse({ country: drill.country, city: drill.city })} className={drill.commune ? 'text-slate-400 hover:text-white' : 'font-semibold text-amber-300'}>
                  {drill.city}
                </button>
              </>
            )}
            {drill.commune && (
              <>
                <ChevronRight className="size-3 text-slate-600" />
                <span className="font-semibold text-amber-300">{drill.commune}</span>
              </>
            )}
          </nav>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="rounded-md bg-slate-900 px-1.5 py-1">
              <div className="text-slate-500">Volume</div>
              <div className="font-mono text-[11px] font-semibold">{compact(drillInfo.volume)}</div>
            </div>
            <div className="rounded-md bg-slate-900 px-1.5 py-1">
              <div className="text-slate-500">CA</div>
              <div className="font-mono text-[11px] font-semibold">{compact(drillInfo.revenue)} F</div>
            </div>
            <div className="rounded-md bg-slate-900 px-1.5 py-1">
              <div className="text-slate-500">Maquis</div>
              <div className="font-mono text-[11px] font-semibold">{compact(drillInfo.pos)}</div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
            <Store className="size-3 text-emerald-400" />
            {drillInfo.placed} maquis placés sur la carte · {drillInfo.communes} commune{drillInfo.communes > 1 ? 's' : ''}
          </div>
          {drillInfo.items.length > 0 && (
            <>
              <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">{drill.city ? 'Communes' : 'Villes'}</div>
              <ul className="mt-1 max-h-44 space-y-0.5 overflow-y-auto pr-1">
                {drillInfo.items.map((it) => (
                  <li key={it.name}>
                    <button
                      onClick={() => {
                        if (drill.city) {
                          const z = located.find((x) => x.zone === it.name && x.city === drill.city && x.country === drill.country);
                          if (z) cb.current.onSelectZone?.(z);
                          immerse({ ...drill, commune: it.name });
                        } else immerse({ country: drill.country, city: it.name });
                      }}
                      className="group flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px] hover:bg-slate-800"
                    >
                      <span className="truncate">{it.name}</span>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-slate-400">
                        {compact(it.volume)} · {it.pos} maq.
                        <ChevronRight className="size-3 text-slate-600 group-hover:text-amber-400" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {drill.city && (
            <button
              onClick={() => immerse(drill.commune ? { country: drill.country, city: drill.city } : { country: drill.country })}
              className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
            >
              <ChevronLeft className="size-3" /> Niveau précédent
            </button>
          )}
        </div>
      )}

      {!located.length && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-xs text-slate-400">Aucune zone localisée pour ces filtres.</div>}
    </div>
  );
}
