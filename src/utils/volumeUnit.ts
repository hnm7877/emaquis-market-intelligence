export type VolumeUnit = 'cols' | 'litres' | 'hl' | 'casiers' | 'fcfa';

export interface VolumeUnitOption {
  id: VolumeUnit;
  value: VolumeUnit;
  label: string;
  shortLabel: string;
  unitSymbol: string;
  description: string;
  icon: string;
}

export const VOLUME_UNIT_OPTIONS: VolumeUnitOption[] = [
  {
    id: 'cols',
    value: 'cols',
    label: 'Cols (Bouteilles)',
    shortLabel: 'Cols',
    unitSymbol: 'cols',
    description: 'Unités vendues (standard consommation)',
    icon: '🍾',
  },
  {
    id: 'litres',
    value: 'litres',
    label: 'Litres (L)',
    shortLabel: 'Litres',
    unitSymbol: 'L',
    description: 'Volume en litres (base 65cl standard)',
    icon: '💧',
  },
  {
    id: 'hl',
    value: 'hl',
    label: 'Hectolitres (hL)',
    shortLabel: 'hL',
    unitSymbol: 'hL',
    description: 'Standard brasserie internationale (100 Litres)',
    icon: '🍺',
  },
  {
    id: 'casiers',
    value: 'casiers',
    label: 'Casiers / Cartons',
    shortLabel: 'Casiers',
    unitSymbol: 'cas.',
    description: 'Conditionnement réel backend (Casiers 12x/24x, Cartons 6x/24x selon format)',
    icon: '📦',
  },
  {
    id: 'fcfa',
    value: 'fcfa',
    label: 'Valeur (FCFA)',
    shortLabel: 'FCFA',
    unitSymbol: 'FCFA',
    description: 'Montant financier des ventes',
    icon: '💰',
  },
];

export interface FormattedVolumeResult {
  formatted: string;
  numericValue: number;
  value: number;
  unitSymbol: string;
  unit: string;
  fullLabel: string;
}

/**
 * Convertit et formate un volume de cols bruts selon l'unité de mesure choisie
 */
export function formatVolumeValue(
  rawCols: number,
  unit: VolumeUnit = 'cols',
  revenue?: number,
): FormattedVolumeResult {
  const safeCols = Math.max(0, Number(rawCols) || 0);

  switch (unit) {
    case 'litres': {
      const litres = Math.round(safeCols * 0.65);
      let formatted: string;
      if (litres >= 1000000) {
        formatted = `${(litres / 1000000).toFixed(1)}M L`;
      } else if (litres >= 1000) {
        formatted = `${(litres / 1000).toFixed(1)}k L`;
      } else {
        formatted = `${litres.toLocaleString('fr-FR')} L`;
      }
      return {
        formatted,
        numericValue: litres,
        value: litres,
        unitSymbol: 'L',
        unit: 'L',
        fullLabel: `${litres.toLocaleString('fr-FR')} Litres`,
      };
    }

    case 'hl': {
      const hl = Number(((safeCols * 0.65) / 100).toFixed(1));
      let formatted: string;
      if (hl >= 1000) {
        formatted = `${(hl / 1000).toFixed(1)}k hL`;
      } else {
        formatted = `${hl.toLocaleString('fr-FR')} hL`;
      }
      return {
        formatted,
        numericValue: hl,
        value: hl,
        unitSymbol: 'hL',
        unit: 'hL',
        fullLabel: `${hl.toLocaleString('fr-FR')} Hectolitres`,
      };
    }

    case 'casiers': {
      // Ratio pondéré moyen du réseau (dominé à 70% par le format 65cl en casiers de 12) : 12 cols/casier standard
      const unitsPerPack = 12;
      const fullPacks = Math.floor(safeCols / unitsPerPack);
      const remainder = safeCols % unitsPerPack;
      const fractional = Number((safeCols / unitsPerPack).toFixed(1));
      let formatted: string;
      if (fullPacks >= 1000) {
        formatted = `${(fullPacks / 1000).toFixed(1)}k cas.${remainder > 0 ? ` (+${remainder})` : ''}`;
      } else {
        formatted = `${fullPacks.toLocaleString('fr-FR')} cas.${remainder > 0 ? ` (+${remainder})` : ''}`;
      }
      return {
        formatted,
        numericValue: fractional,
        value: fractional,
        unitSymbol: 'cas.',
        unit: 'casiers',
        fullLabel: `${fullPacks.toLocaleString('fr-FR')} Casiers${remainder > 0 ? ` + ${remainder} cols restants` : ''}`,
      };
    }

    case 'fcfa': {
      const val = revenue != null ? revenue : safeCols * 800;
      let formatted: string;
      if (val >= 1000000) {
        formatted = `${(val / 1000000).toFixed(1)}M FCFA`;
      } else if (val >= 1000) {
        formatted = `${(val / 1000).toFixed(1)}k FCFA`;
      } else {
        formatted = `${val.toLocaleString('fr-FR')} FCFA`;
      }
      return {
        formatted,
        numericValue: val,
        value: val,
        unitSymbol: 'FCFA',
        unit: 'FCFA',
        fullLabel: `${val.toLocaleString('fr-FR')} FCFA`,
      };
    }

    case 'cols':
    default: {
      let formatted: string;
      if (safeCols >= 1000000) {
        formatted = `${(safeCols / 1000000).toFixed(1)}M cols`;
      } else if (safeCols >= 1000) {
        formatted = `${(safeCols / 1000).toFixed(1)}k cols`;
      } else {
        formatted = `${safeCols.toLocaleString('fr-FR')} cols`;
      }
      return {
        formatted,
        numericValue: safeCols,
        value: safeCols,
        unitSymbol: 'cols',
        unit: 'cols',
        fullLabel: `${safeCols.toLocaleString('fr-FR')} Cols`,
      };
    }
  }
}
