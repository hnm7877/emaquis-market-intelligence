// Coordonnées géographiques de référence pour la cartographie E-Maquis (100% Hors-ligne / Sans API externe)
export const GEO_COORDINATES: Record<string, { lat: number; lng: number; country: string; city: string }> = {
  // --- Communes d'Abidjan (Côte d'Ivoire) ---
  yopougon: { lat: 5.3438, lng: -4.0725, country: "Côte d'Ivoire", city: 'Abidjan' },
  yop: { lat: 5.3438, lng: -4.0725, country: "Côte d'Ivoire", city: 'Abidjan' },
  cocody: { lat: 5.3547, lng: -3.9783, country: "Côte d'Ivoire", city: 'Abidjan' },
  abobo: { lat: 5.4164, lng: -4.0159, country: "Côte d'Ivoire", city: 'Abidjan' },
  marcory: { lat: 5.3045, lng: -3.9842, country: "Côte d'Ivoire", city: 'Abidjan' },
  koumassi: { lat: 5.3012, lng: -3.9489, country: "Côte d'Ivoire", city: 'Abidjan' },
  treichville: { lat: 5.3006, lng: -4.0094, country: "Côte d'Ivoire", city: 'Abidjan' },
  adjame: { lat: 5.3551, lng: -4.0242, country: "Côte d'Ivoire", city: 'Abidjan' },
  adjamé: { lat: 5.3551, lng: -4.0242, country: "Côte d'Ivoire", city: 'Abidjan' },
  plateau: { lat: 5.3256, lng: -4.0211, country: "Côte d'Ivoire", city: 'Abidjan' },
  port_bouet: { lat: 5.2575, lng: -3.9442, country: "Côte d'Ivoire", city: 'Abidjan' },
  portbouet: { lat: 5.2575, lng: -3.9442, country: "Côte d'Ivoire", city: 'Abidjan' },
  'port-bouët': { lat: 5.2575, lng: -3.9442, country: "Côte d'Ivoire", city: 'Abidjan' },
  'port-bouet': { lat: 5.2575, lng: -3.9442, country: "Côte d'Ivoire", city: 'Abidjan' },
  bingerville: { lat: 5.3567, lng: -3.8911, country: "Côte d'Ivoire", city: 'Abidjan' },
  attecoube: { lat: 5.34, lng: -4.04, country: "Côte d'Ivoire", city: 'Abidjan' },
  attécoubé: { lat: 5.34, lng: -4.04, country: "Côte d'Ivoire", city: 'Abidjan' },
  anyama: { lat: 5.4947, lng: -4.0519, country: "Côte d'Ivoire", city: 'Abidjan' },
  songon: { lat: 5.3183, lng: -4.2567, country: "Côte d'Ivoire", city: 'Abidjan' },
  angre: { lat: 5.378, lng: -3.985, country: "Côte d'Ivoire", city: 'Abidjan' },
  riviera: { lat: 5.352, lng: -3.96, country: "Côte d'Ivoire", city: 'Abidjan' },
  zone4: { lat: 5.295, lng: -3.975, country: "Côte d'Ivoire", city: 'Abidjan' },

  // --- Villes & Communes de l'Intérieur (Côte d'Ivoire) ---
  grand_bassam: { lat: 5.2117, lng: -3.7388, country: "Côte d'Ivoire", city: 'Grand-Bassam' },
  grandbassam: { lat: 5.2117, lng: -3.7388, country: "Côte d'Ivoire", city: 'Grand-Bassam' },
  bassam: { lat: 5.2117, lng: -3.7388, country: "Côte d'Ivoire", city: 'Grand-Bassam' },
  tiassale: { lat: 5.8983, lng: -4.8228, country: "Côte d'Ivoire", city: 'Tiassalé' },
  tiassalé: { lat: 5.8983, lng: -4.8228, country: "Côte d'Ivoire", city: 'Tiassalé' },
  bouake: { lat: 7.6939, lng: -5.0303, country: "Côte d'Ivoire", city: 'Bouaké' },
  bouaké: { lat: 7.6939, lng: -5.0303, country: "Côte d'Ivoire", city: 'Bouaké' },
  yamoussoukro: { lat: 6.8276, lng: -5.2893, country: "Côte d'Ivoire", city: 'Yamoussoukro' },
  san_pedro: { lat: 4.7485, lng: -6.6363, country: "Côte d'Ivoire", city: 'San-Pédro' },
  sanpedro: { lat: 4.7485, lng: -6.6363, country: "Côte d'Ivoire", city: 'San-Pédro' },
  korhogo: { lat: 9.458, lng: -5.6296, country: "Côte d'Ivoire", city: 'Korhogo' },
  daloa: { lat: 6.877, lng: -6.4502, country: "Côte d'Ivoire", city: 'Daloa' },
  man: { lat: 7.4125, lng: -7.5538, country: "Côte d'Ivoire", city: 'Man' },
  gagnoa: { lat: 6.1319, lng: -5.9506, country: "Côte d'Ivoire", city: 'Gagnoa' },
  divo: { lat: 5.8372, lng: -5.3572, country: "Côte d'Ivoire", city: 'Divo' },
  dabou: { lat: 5.3256, lng: -4.3767, country: "Côte d'Ivoire", city: 'Dabou' },
  agboville: { lat: 5.9278, lng: -4.2189, country: "Côte d'Ivoire", city: 'Agboville' },
  abengourou: { lat: 6.7297, lng: -3.4964, country: "Côte d'Ivoire", city: 'Abengourou' },
  bondoukou: { lat: 8.0403, lng: -2.8, country: "Côte d'Ivoire", city: 'Bondoukou' },
  aboisso: { lat: 5.4678, lng: -3.2075, country: "Côte d'Ivoire", city: 'Aboisso' },
  soubre: { lat: 5.7856, lng: -6.5944, country: "Côte d'Ivoire", city: 'Soubré' },
  bouafle: { lat: 6.9903, lng: -5.7442, country: "Côte d'Ivoire", city: 'Bouaflé' },
  ferke: { lat: 9.5928, lng: -5.1944, country: "Côte d'Ivoire", city: 'Ferkessédougou' },
  ferkessedougou: { lat: 9.5928, lng: -5.1944, country: "Côte d'Ivoire", city: 'Ferkessédougou' },

  // --- Burkina Faso ---
  ouagadougou: { lat: 12.3714, lng: -1.5197, country: 'Burkina Faso', city: 'Ouagadougou' },
  ouaga: { lat: 12.3714, lng: -1.5197, country: 'Burkina Faso', city: 'Ouagadougou' },
  bobo_dioulasso: { lat: 11.1772, lng: -4.2979, country: 'Burkina Faso', city: 'Bobo-Dioulasso' },
  bobodioulasso: { lat: 11.1772, lng: -4.2979, country: 'Burkina Faso', city: 'Bobo-Dioulasso' },
  koudougou: { lat: 12.25, lng: -2.3667, country: 'Burkina Faso', city: 'Koudougou' },

  // --- République Démocratique du Congo (RDC) ---
  kinshasa: { lat: -4.4419, lng: 15.2663, country: 'RDC', city: 'Kinshasa' },
  gombe: { lat: -4.3033, lng: 15.3056, country: 'RDC', city: 'Kinshasa' },
  limete: { lat: -4.3542, lng: 15.3411, country: 'RDC', city: 'Kinshasa' },
  bandalungwa: { lat: -4.3411, lng: 15.2819, country: 'RDC', city: 'Kinshasa' },
  lubumbashi: { lat: -11.6876, lng: 27.4847, country: 'RDC', city: 'Lubumbashi' },
  goma: { lat: -1.6742, lng: 29.2285, country: 'RDC', city: 'Goma' },

  // --- Sénégal ---
  dakar: { lat: 14.7167, lng: -17.4677, country: 'Sénégal', city: 'Dakar' },
  almadies: { lat: 14.7475, lng: -17.5197, country: 'Sénégal', city: 'Dakar' },
  plateau_dakar: { lat: 14.6711, lng: -17.4331, country: 'Sénégal', city: 'Dakar' },

  // --- Bénin ---
  cotonou: { lat: 6.3703, lng: 2.3912, country: 'Bénin', city: 'Cotonou' },
  cadjehoun: { lat: 6.3567, lng: 2.3989, country: 'Bénin', city: 'Cotonou' },
};

export function normalizeGeoKey(val?: string): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Résolution des coordonnées GPS d'une commune / zone
 */
export function resolveZoneCoordinates(
  zoneName: string,
  cityName?: string,
  countryName?: string,
  indexFallback = 0,
): { latitude: number; longitude: number; resolvedCity: string; resolvedCountry: string } {
  const normZone = normalizeGeoKey(zoneName);
  const normCity = normalizeGeoKey(cityName);

  // 1. Match direct sur la zone / commune
  if (GEO_COORDINATES[normZone]) {
    const found = GEO_COORDINATES[normZone];
    return {
      latitude: found.lat,
      longitude: found.lng,
      resolvedCity: found.city,
      resolvedCountry: found.country,
    };
  }

  // 2. Match partiel sur la zone
  for (const [key, coords] of Object.entries(GEO_COORDINATES)) {
    if (normZone.includes(key) || key.includes(normZone)) {
      return {
        latitude: coords.lat,
        longitude: coords.lng,
        resolvedCity: coords.city,
        resolvedCountry: coords.country,
      };
    }
  }

  // 3. Match sur la ville
  if (normCity && GEO_COORDINATES[normCity]) {
    const found = GEO_COORDINATES[normCity];
    return {
      latitude: found.lat + (indexFallback % 4) * 0.015,
      longitude: found.lng + (indexFallback % 3) * 0.015,
      resolvedCity: found.city,
      resolvedCountry: found.country,
    };
  }

  // 4. Fallback pays
  if (countryName?.toLowerCase().includes('burkina')) {
    return {
      latitude: 12.3714 + (indexFallback % 4) * 0.02,
      longitude: -1.5197 + (indexFallback % 4) * 0.02,
      resolvedCity: cityName || 'Ouagadougou',
      resolvedCountry: 'Burkina Faso',
    };
  }
  if (countryName?.toLowerCase().includes('congo') || countryName?.toLowerCase().includes('rdc')) {
    return {
      latitude: -4.4419 + (indexFallback % 4) * 0.02,
      longitude: 15.2663 + (indexFallback % 4) * 0.02,
      resolvedCity: cityName || 'Kinshasa',
      resolvedCountry: 'RDC',
    };
  }

  // 5. Fallback Abidjan
  return {
    latitude: 5.3438 + (indexFallback % 5) * 0.025,
    longitude: -4.0725 + (indexFallback % 4) * 0.025,
    resolvedCity: cityName || 'Abidjan',
    resolvedCountry: "Côte d'Ivoire",
  };
}
