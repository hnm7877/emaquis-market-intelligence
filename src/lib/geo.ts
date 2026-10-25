/** Outils géographiques côté navigateur (distances, rayons, tournées). */

export type LngLat = [number, number];

const R = 6371; // rayon terrestre (km)
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance à vol d'oiseau en km */
export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Polygone (GeoJSON) d'un cercle de `km` autour d'un point */
export function circlePolygon(center: LngLat, km: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center;
  const coords: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const dLat = (km / R) * Math.sin(t);
    const dLng = ((km / R) * Math.cos(t)) / Math.cos(rad(lat));
    coords.push([lng + (dLng * 180) / Math.PI, lat + (dLat * 180) / Math.PI]);
  }
  return { type: 'Feature', properties: { km }, geometry: { type: 'Polygon', coordinates: [coords] } };
}

/**
 * Ordre de visite court : plus proche voisin depuis le départ, puis amélioration 2-opt.
 * Renvoie les indices des arrêts dans l'ordre de visite (le départ n'est pas inclus).
 */
export function optimizeRoute(start: LngLat, stops: LngLat[]): number[] {
  if (stops.length <= 1) return stops.map((_, i) => i);
  const left = new Set(stops.map((_, i) => i));
  const order: number[] = [];
  let cur = start;
  while (left.size) {
    let best = -1;
    let bestD = Infinity;
    for (const i of left) {
      const d = haversineKm(cur, stops[i]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    order.push(best);
    left.delete(best);
    cur = stops[best];
  }
  const pt = (k: number) => (k < 0 ? start : stops[order[k]]);
  let improved = true;
  for (let pass = 0; improved && pass < 50; pass++) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const before = haversineKm(pt(i - 1), pt(i)) + (j + 1 < order.length ? haversineKm(pt(j), pt(j + 1)) : 0);
        const after = haversineKm(pt(i - 1), pt(j)) + (j + 1 < order.length ? haversineKm(pt(i), pt(j + 1)) : 0);
        if (after + 1e-9 < before) {
          order.splice(i, j - i + 1, ...order.slice(i, j + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return order;
}

/** Longueur totale d'un trajet (km) */
export function pathKm(points: LngLat[]): number {
  let t = 0;
  for (let i = 1; i < points.length; i++) t += haversineKm(points[i - 1], points[i]);
  return t;
}
