'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface StockoutZone {
  zone: string;
  city: string;
  lat: number;
  lng: number;
  positions: number;
  establishments: number;
  stockoutPos: number;
  lowStockPos: number;
  stockoutRate: number;
}

const STYLE = 'https://tiles.openfreemap.org/styles/dark';

function toGeoJson(zones: StockoutZone[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((z, i) => ({
      type: 'Feature',
      id: i,
      geometry: { type: 'Point', coordinates: [z.lng, z.lat] },
      properties: { i, rate: z.stockoutRate, positions: z.positions },
    })),
  };
}

/** Texte de la bulle d'info (construit en DOM : aucun HTML injecté depuis les données) */
function tip(z: StockoutZone) {
  const el = document.createElement('div');
  el.style.cssText = 'font: 12px system-ui; color: #e5e7eb; min-width: 170px';
  const title = document.createElement('div');
  title.style.cssText = 'font-weight: 700; margin-bottom: 4px';
  title.textContent = `${z.zone} · ${z.city}`;
  el.appendChild(title);
  [
    `${z.stockoutRate} % des produits en rupture`,
    `${z.stockoutPos} / ${z.positions} positions à zéro`,
    `${z.lowStockPos} sous le seuil · ${z.establishments} établissements`,
  ].forEach((t) => {
    const line = document.createElement('div');
    line.style.opacity = '0.8';
    line.textContent = t;
    el.appendChild(line);
  });
  return el;
}

/**
 * Carte des ruptures : une bulle par commune (taille = produits suivis, couleur = taux de rupture).
 * Les données arrivent par le direct : la source est mise à jour sans recréer la carte.
 */
export default function StockoutMap({ zones, onSelect }: { zones: StockoutZone[]; onSelect?: (zone: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const data = useRef(zones);
  const select = useRef(onSelect);
  const fitted = useRef(false);
  // Dernières valeurs gardées pour les gestionnaires de la carte (créés une seule fois)
  useEffect(() => {
    data.current = zones;
    select.current = onSelect;
  }, [zones, onSelect]);

  useEffect(() => {
    if (!box.current) return;
    const map = new maplibregl.Map({ container: box.current, style: STYLE, center: [-4.0, 5.35], zoom: 9, attributionControl: { compact: true } });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'mi-geo-popup' });

    map.on('load', () => {
      map.addSource('stockouts', { type: 'geojson', data: toGeoJson(data.current) });
      map.addLayer({
        id: 'stockout-halo',
        type: 'circle',
        source: 'stockouts',
        filter: ['>=', ['get', 'rate'], 15],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'positions']], 1, 14, 40, 46],
          'circle-color': '#f43f5e',
          'circle-opacity': 0.18,
          'circle-blur': 0.8,
        },
      });
      map.addLayer({
        id: 'stockout-circle',
        type: 'circle',
        source: 'stockouts',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'positions']], 1, 6, 40, 30],
          'circle-color': ['interpolate', ['linear'], ['get', 'rate'], 0, '#10b981', 5, '#84cc16', 10, '#f59e0b', 20, '#f43f5e'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.6)',
          'circle-radius-transition': { duration: 700 },
          'circle-color-transition': { duration: 700 },
        },
      });
      fit();
    });

    const fit = () => {
      if (fitted.current || !data.current.length) return;
      const b = new maplibregl.LngLatBounds();
      data.current.forEach((z) => b.extend([z.lng, z.lat]));
      map.fitBounds(b, { padding: 50, maxZoom: 12, duration: 900 });
      fitted.current = true;
    };

    map.on('mousemove', 'stockout-circle', (e) => {
      const z = data.current[Number(e.features?.[0]?.properties?.i)];
      if (!z) return;
      map.getCanvas().style.cursor = 'pointer';
      popup.setLngLat([z.lng, z.lat]).setDOMContent(tip(z)).addTo(map);
    });
    map.on('mouseleave', 'stockout-circle', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });
    map.on('click', 'stockout-circle', (e) => {
      const z = data.current[Number(e.features?.[0]?.properties?.i)];
      if (z) select.current?.(z.zone);
    });

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Nouvelles valeurs poussées : mise à jour de la source (transition de couleur / taille)
  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource('stockouts') as GeoJSONSource | undefined;
    if (!map || !src) return;
    src.setData(toGeoJson(zones));
    if (!fitted.current && zones.length) {
      const b = new maplibregl.LngLatBounds();
      zones.forEach((z) => b.extend([z.lng, z.lat]));
      map.fitBounds(b, { padding: 50, maxZoom: 12, duration: 900 });
      fitted.current = true;
    }
  }, [zones]);

  return <div ref={box} className="h-full w-full" />;
}
