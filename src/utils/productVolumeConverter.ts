/**
 * Utilitaire de conversion universelle des volumes de boissons pour E-Maquis Market Intelligence.
 * Supporte : Bouteilles/Cols (cols), Centilitres (cL), Litres (L) et Casiers (cas.).
 */

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
    description: 'Unités unitaires vendues (tickets de caisse réels)',
  },
  {
    id: 'cl',
    label: 'Centilitres (cL)',
    shortLabel: 'cL',
    symbol: 'cL',
    description: 'Volume liquide en centilitres (selon le format réel : 33cl, 50cl, 65cl)',
  },
  {
    id: 'litres',
    label: 'Litres (L)',
    shortLabel: 'Litres (L)',
    symbol: 'L',
    description: 'Volume liquide en litres réels',
  },
  {
    id: 'casiers',
    label: 'Casiers (24x)',
    shortLabel: 'Casiers',
    symbol: 'cas.',
    description: 'Nombre de casiers équivalents (base 24 bouteilles)',
  },
];

/**
 * Détecte le gabarit en centilitres (cL) à partir du nom du produit ou de son format
 */
export function extractBottleSizeCl(productName: string, sizeOrFormat?: string): number {
  const text = `${productName || ''} ${sizeOrFormat || ''}`.toLowerCase();
  
  if (text.includes('65') || text.includes('66')) return 65;
  if (text.includes('50')) return 50;
  if (text.includes('33')) return 33;
  if (text.includes('75')) return 75;
  if (text.includes('100') || text.includes('1l') || text.includes('1 l')) return 100;
  if (text.includes('25')) return 25;
  
  return 65; // Format standard de référence en Côte d'Ivoire (bouteille 65cl)
}

/**
 * Convertit un volume réel de cols bruts selon l'unité choisie
 */
export function formatProductVolume(
  rawVolumeCols: number,
  unit: DisplayVolumeUnit = 'cols',
  productName: string = '',
  sizeOrFormat?: string
): { formatted: string; rawNumber: number; unitLabel: string } {
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
      const casiers = Math.round(cols / 24);
      let formatted: string;
      if (casiers >= 1000) {
        formatted = `${(casiers / 1000).toFixed(1)}k cas.`;
      } else {
        formatted = `${casiers.toLocaleString('fr-FR')} cas.`;
      }
      return { formatted, rawNumber: casiers, unitLabel: 'cas.' };
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
    term: 'Vélocité (vitesse de vente)',
    formula: 'Volume écoulé / Heures d\'activité',
    definition: 'Vitesse à laquelle les bouteilles quittent les frigos et sont servies aux clients par heure dans les établissements connectés. Une vélocité élevée indique un produit à forte rotation qui libère immédiatement du cash et nécessite un réapprovisionnement fréquent.',
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
  {
    term: 'Surge (Pic de Vente)',
    formula: 'Hausse instantanée > 50% de la vélocité médiane',
    definition: 'Accélération soudaine des débits observée en direct (typiquement lors des Happy Hours 18h-20h, matchs de football ou soirées festives du week-end).',
    badge: 'Temps Réel',
  },
];
