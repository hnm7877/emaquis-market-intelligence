/**
 * Utilitaire de conversion universelle des volumes de boissons pour E-Maquis Market Intelligence.
 * Supporte : Bouteilles/Cols (cols), Centilitres (cL), Litres (L) et Casiers/Cartons (cas.).
 * 
 * Intègre la logique métier du backend (generateQuantityByLocker) :
 * - Bières grands formats (50cl, 60cl, 65cl) : 12 bouteilles / casier
 * - Bières petits formats (25cl, 30cl, 33cl) : 24 bouteilles / casier
 * - Canettes (toutes tailles) : 24 canettes / carton
 * - Vins & Spiritueux (75cl, 1L) : 6 bouteilles / carton (Valpierre : 12)
 * - Cumul précis des bouteilles individuelles restantes (reliquats de cols)
 */

import {
  PackageType,
  PackagingSpec,
  ProductPackageResult,
  CategoryPackageAggregate,
  extractBottleSizeCl,
  getProductPackagingSpec,
  calculateProductPackage,
  aggregateCategoryPackages,
} from './packagingConverter';

export {
  extractBottleSizeCl,
  getProductPackagingSpec,
  calculateProductPackage,
  aggregateCategoryPackages,
};

export type { PackageType, PackagingSpec, ProductPackageResult, CategoryPackageAggregate };

export type DisplayVolumeUnit = 'cols' | 'cl' | 'litres' | 'casiers';

export interface VolumeUnitOptionItem {
  id: DisplayVolumeUnit;
  label: string;
  shortLabel: string;
  symbol: string;
  description: string;
}

export const DISPLAY_VOLUME_UNITS: VolumeUnitOptionItem[] = [
  {
    id: 'cols',
    label: 'Bouteilles / Cols (cols)',
    shortLabel: 'Cols',
    symbol: 'cols',
    description: 'Unités unitaires vendues (tickets de caisse réels en BD)',
  },
  {
    id: 'cl',
    label: 'Centilitres (cL)',
    shortLabel: 'cL',
    symbol: 'cL',
    description: 'Volume liquide en centilitres (selon le format réel : 33cl, 50cl, 65cl, 75cl)',
  },
  {
    id: 'litres',
    label: 'Litres (L)',
    shortLabel: 'Litres (L)',
    symbol: 'L',
    description: 'Volume liquide en litres réels cumulés',
  },
  {
    id: 'casiers',
    label: 'Casiers / Cartons',
    shortLabel: 'Casiers',
    symbol: 'cas.',
    description: 'Conditionnement réel backend (Casiers 12x/24x, Cartons 6x/24x selon taille et restes cumulés)',
  },
];

export interface FormattedProductVolumeResult {
  formatted: string;
  rawNumber: number;
  unitLabel: string;
  packageType?: PackageType;
  fullPackages?: number;
  remainderCols?: number;
  formattedDetailed?: string;
}

/**
 * Convertit un volume réel de cols bruts selon l'unité choisie
 * Applique strictement la règle de conditionnement backend pour les casiers/cartons
 */
export function formatProductVolume(
  rawVolumeCols: number,
  unit: DisplayVolumeUnit = 'cols',
  productName: string = '',
  sizeOrFormat?: string,
  categoryName?: string,
  stockType?: string
): FormattedProductVolumeResult {
  const cols = Math.max(0, Number(rawVolumeCols) || 0);
  const sizeCl = extractBottleSizeCl(productName, sizeOrFormat);

  switch (unit) {
    case 'cl': {
      const totalCl = cols * sizeCl;
      let formatted: string;
      if (totalCl >= 1000000) {
        formatted = `${(totalCl / 1000000).toFixed(2)}M cL`;
      } else if (totalCl >= 1000) {
        formatted = `${(totalCl / 1000).toFixed(1)}k cL`;
      } else {
        formatted = `${totalCl.toLocaleString('fr-FR')} cL`;
      }
      return { formatted, rawNumber: totalCl, unitLabel: 'cL' };
    }

    case 'litres': {
      const totalL = (cols * sizeCl) / 100;
      let formatted: string;
      if (totalL >= 1000000) {
        formatted = `${(totalL / 1000000).toFixed(2)}M L`;
      } else if (totalL >= 1000) {
        formatted = `${(totalL / 1000).toFixed(1)}k L`;
      } else {
        formatted = `${Math.round(totalL).toLocaleString('fr-FR')} L`;
      }
      return { formatted, rawNumber: totalL, unitLabel: 'L' };
    }

    case 'casiers': {
      // Logique exacte du Backend E-Maquis (generateQuantityByLocker)
      const packResult = calculateProductPackage(cols, productName, sizeOrFormat, categoryName, stockType);
      return {
        formatted: packResult.formatted,
        rawNumber: packResult.fractionalPackages,
        unitLabel: packResult.unitLabel,
        packageType: packResult.packageType,
        fullPackages: packResult.fullPackages,
        remainderCols: packResult.remainderCols,
        formattedDetailed: packResult.formattedDetailed,
      };
    }

    case 'cols':
    default: {
      let formatted: string;
      if (cols >= 1000000) {
        formatted = `${(cols / 1000000).toFixed(2)}M cols`;
      } else if (cols >= 1000) {
        formatted = `${(cols / 1000).toFixed(1)}k cols`;
      } else {
        formatted = `${cols.toLocaleString('fr-FR')} cols`;
      }
      return { formatted, rawNumber: cols, unitLabel: 'cols' };
    }
  }
}

/**
 * Lexique des termes financiers et de distribution pour décideurs
 */
export const MARKET_TERMS_GLOSSARY = [
  {
    term: 'Casiers & Cartons (Conditionnement Backend)',
    formula: 'Cols vendus / Ratio de conditionnement par format',
    definition: 'Conversion exacte selon la règle backend (generateQuantityByLocker) : les grandes bières 50cl/65cl comptent 12 cols par casier (ex: Bock 65cl), les petites bouteilles 25cl/33cl comptent 24 cols par casier (ex: Heineken 33cl), les canettes 24 par carton, et les vins/spiritueux 6 par carton (Valpierre : 12). Les bouteilles vendues à l\'unité sont fidèlement cumulées pour former des emballages complets, et le reliquat restant est affiché en clair (+X cols).',
    badge: 'Logique Certifiée Backend',
  },
  {
    term: 'Cols (Bouteilles unitaires)',
    formula: 'Lignes de tickets de caisse réelles des POS',
    definition: 'Unité universelle de consommation brasserie : 1 col correspond à 1 bouteille ou canette individuelle servie au client dans le maquis, enregistrée dans la base de données.',
    badge: 'Standard CHR',
  },
  {
    term: 'Vélocité (vitesse de débit)',
    formula: 'Volume écoulé / Heures d\'activité',
    definition: 'Rythme auquel les bouteilles quittent les frigos et sont servies par heure dans les établissements connectés. Mesure la tension de consommation instantanée.',
    badge: 'Performance Débit',
  },
  {
    term: 'Volume Écoulé',
    formula: 'Somme brute des tickets de caisse POS',
    definition: 'Nombre exact de bouteilles (cols) ou litres physiques consommés et validés par les serveurs et barmans dans le réseau E-Maquis, sans aucune estimation ni extrapolation statistique.',
    badge: 'Donnée Réelle BD',
  },
  {
    term: 'Part du Top (%)',
    formula: '(Volume du produit / Volume du Leader #1) × 100',
    definition: 'Indicateur de duel concurrentiel : mesure l\'intensité de la menace que fait peser un challenger sur la référence n°1 du marché (ex: Heineken à 88% du volume de Bock).',
    badge: 'Duel Marché',
  },
  {
    term: 'Index de Demande',
    formula: '(Volume par point de vente de la zone / Moyenne réseau) × 100',
    definition: 'Indice normalisé sur une base 100. Un score supérieur à 100 (ex: 135) indique une surconsommation relative par rapport à la moyenne nationale.',
    badge: 'Indice Base 100',
  },
  {
    term: 'Taux de Rotation',
    formula: 'Ventes hebdomadaires / Stock moyen présent',
    definition: 'Nombre de fois où le stock d\'un produit est intégralement vendu et renouvelé au cours d\'une période donnée.',
    badge: 'Gestion Stock',
  },
];
