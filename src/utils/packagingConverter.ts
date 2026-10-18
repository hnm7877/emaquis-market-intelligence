/**
 * Convertisseur et agrégateur universel de Conditionnements (Casiers & Cartons)
 * 
 * Implémente fidèlement les règles métier du Backend E-Maquis (generateQuantityByLocker) :
 * 
 * 1. Canettes (toutes tailles : 33cl, 50cl, etc.) :
 *    - 24 unités par carton / pack
 *    - Type : 'carton' (ctn)
 * 
 * 2. Grandes bouteilles verre consigné (50cl, 60cl, 65cl) :
 *    - Exemples : Bock 65cl, Ivoire 65cl, Beaufort 50cl, Castel 65cl, etc.
 *    - 12 bouteilles par casier (Casier de 12)
 *    - Type : 'casier' (cas.)
 * 
 * 3. Petites bouteilles verre consigné (25cl, 30cl, 33cl) :
 *    - Exemples : Heineken 33cl, Desperados 33cl, Beaufort 33cl, Coca 30cl, etc.
 *    - 24 bouteilles par casier (Casier de 24)
 *    - Type : 'casier' (cas.)
 * 
 * 4. Vins, Spiritueux, Champagnes, Liqueurs (75cl, 1L, etc.) :
 *    - Valpierre : 12 bouteilles par carton (Carton de 12)
 *    - Autres vins / spiritueux / champagnes : 6 bouteilles par carton (Carton de 6)
 *    - Type : 'carton' (ctn)
 * 
 * 5. Boissons diverses sans taille explicite :
 *    - Standard 65cl par défaut (12 bouteilles / casier)
 */

export type PackageType = 'casier' | 'carton';

export interface PackagingSpec {
  unitsPerPackage: number;
  packageType: PackageType;
  packageLabel: string; // Ex: 'Casier (12x)' | 'Casier (24x)' | 'Carton (6x)' | 'Carton (24x)'
  shortLabel: string;   // 'cas.' | 'ctn'
  singularLabel: string;// 'casier' | 'carton'
  pluralLabel: string;  // 'casiers' | 'cartons'
}

export interface ProductPackageResult {
  rawCols: number;
  unitsPerPackage: number;
  packageType: PackageType;
  fullPackages: number;
  remainderCols: number;
  fractionalPackages: number;
  formatted: string;         // '1 200 cas. (+4 cols)' ou '1 200 cas.'
  formattedCompact: string;  // '1.2k cas.'
  formattedDetailed: string; // '1 200 casiers (12x) · 4 cols restants'
  unitLabel: string;         // 'cas.' | 'ctn'
}

export interface CategoryPackageAggregate {
  categoryName: string;
  totalCols: number;
  totalFullPackages: number;
  totalRemainderCols: number;
  effectivePackages: number;  // Nombre de casiers/cartons après cumul des restes
  leftoverCols: number;       // Reste final après cumul des restes
  casiersCount: number;       // Nombre de casiers complets formés
  cartonsCount: number;       // Nombre de cartons complets formés
  formatted: string;          // Ex: '2 450 cas. (+6 cols)'
  formattedDetailed: string;  // Ex: '2 450 casiers formés · 6 cols restants'
}

/**
 * Détecte DYNAMIQUEMENT la contenance en centilitres (cL) depuis n'importe quelle chaîne ou unité
 * Gère automatiquement : '33cl', '0.5L', '1.5L', '75cl', '250ml', '500', '1L', '20cl', '45cl', etc.
 */
export function extractBottleSizeCl(productName: string = '', sizeOrFormat?: string): number {
  const size = (sizeOrFormat || '').trim().toLowerCase();
  const name = (productName || '').trim().toLowerCase();

  // 1. Détection format Litres (ex: 1.5L, 1L, 0.75L)
  const matchL = size.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litre)/i);
  if (matchL) {
    return Math.round(parseFloat(matchL[1].replace(',', '.')) * 100);
  }

  // 2. Détection format Centilitres (ex: 65cl, 33cl, 50c)
  const matchCl = size.match(/(\d+(?:[.,]\d+)?)\s*(?:cl|c)/i);
  if (matchCl) {
    return Math.round(parseFloat(matchCl[1].replace(',', '.')));
  }

  // 3. Détection format Millilitres (ex: 330ml, 500ml)
  const matchMl = size.match(/(\d+(?:[.,]\d+)?)\s*(?:ml)/i);
  if (matchMl) {
    return Math.round(parseFloat(matchMl[1].replace(',', '.')) / 10);
  }

  // 4. Nombre brut (ex: "33", "50", "65", "1")
  const matchNum = size.match(/^(\d+(?:[.,]\d+)?)$/);
  if (matchNum) {
    const n = parseFloat(matchNum[1]);
    return n <= 5 ? Math.round(n * 100) : Math.round(n);
  }

  // 5. Extraction depuis le nom du produit (ex: "Bock-50", "Heineken-33", "Beaufort 65cl")
  const matchNameL = name.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litre)/i);
  if (matchNameL) {
    return Math.round(parseFloat(matchNameL[1].replace(',', '.')) * 100);
  }
  const matchNameCl = name.match(/(\d+(?:[.,]\d+)?)\s*(?:cl)/i) || name.match(/(?:^|\s|-|_)(20|25|30|33|40|45|50|60|65|70|75|100|150|250)(?:$|\s|-|_)/i);
  if (matchNameCl) {
    return Math.round(parseFloat(matchNameCl[1].replace(',', '.')));
  }

  return 65; // Format standard de référence
}

/**
 * Règle 100% dynamique et universelle : s'adapte à toute nouvelle contenance ou conditionnement dans la BD
 */
export function getProductPackagingSpec(
  productName: string = '',
  sizeOrFormat?: string,
  categoryName?: string,
  stockType?: string
): PackagingSpec {
  const nameLower = (productName || '').toLowerCase();
  const catLower = (categoryName || '').toLowerCase();
  const sizeLower = (sizeOrFormat || '').toLowerCase();
  const stLower = (stockType || '').toLowerCase();
  const sizeCl = extractBottleSizeCl(productName, sizeOrFormat);

  // 1. Canettes
  const isCanette =
    nameLower.includes('canette') ||
    nameLower.includes('cannette') ||
    sizeLower.includes('canette') ||
    sizeLower.includes('can.');

  if (isCanette) {
    return {
      unitsPerPackage: 24,
      packageType: 'carton',
      packageLabel: 'Carton (24 canettes)',
      shortLabel: 'ctn',
      singularLabel: 'carton',
      pluralLabel: 'cartons',
    };
  }

  // 2. Vins, Spiritueux, Liqueurs, Champagnes
  const isWineOrSpirits =
    catLower.includes('vin') ||
    catLower.includes('spiritueux') ||
    catLower.includes('liqueur') ||
    catLower.includes('champagne') ||
    catLower.includes('whisky') ||
    catLower.includes('rhum') ||
    catLower.includes('vodka') ||
    nameLower.includes('vin ') ||
    nameLower.includes('whisky') ||
    nameLower.includes('champagne') ||
    nameLower.includes('liqueur');

  if (isWineOrSpirits) {
    if (nameLower.includes('valpierre')) {
      return {
        unitsPerPackage: 12,
        packageType: 'carton',
        packageLabel: 'Carton (12 bouteilles)',
        shortLabel: 'ctn',
        singularLabel: 'carton',
        pluralLabel: 'cartons',
      };
    }
    return {
      unitsPerPackage: sizeCl >= 250 ? 1 : 6,
      packageType: 'carton',
      packageLabel: `Carton (${sizeCl >= 250 ? 1 : 6} bouteilles)`,
      shortLabel: 'ctn',
      singularLabel: 'carton',
      pluralLabel: 'cartons',
    };
  }

  // 3. Détection dynamique basée sur le contenant et la capacité physique universelle
  const isCarton = stLower === 'cardboard' || sizeCl > 75;
  const packageType: PackageType = isCarton ? 'carton' : 'casier';

  let unitsPerPackage = 12;
  if (sizeCl <= 35) {
    // Petits formats (<= 35 cL : 20cl, 25cl, 30cl, 33cl) -> 24 par emballage
    unitsPerPackage = 24;
  } else if (sizeCl <= 66) {
    // Formats intermédiaires (36-66 cL : 45cl, 50cl, 60cl, 65cl) -> 12 par emballage
    unitsPerPackage = 12;
  } else {
    // Grands formats (>= 70 cL : 70cl, 75cl, 1L, 1.5L) -> 6 par emballage
    unitsPerPackage = sizeCl >= 250 ? 1 : 6;
  }

  const labelPrefix = packageType === 'casier' ? 'Casier' : 'Carton';
  return {
    unitsPerPackage,
    packageType,
    packageLabel: `${labelPrefix} (${unitsPerPackage} bouteilles)`,
    shortLabel: packageType === 'casier' ? 'cas.' : 'ctn',
    singularLabel: packageType,
    pluralLabel: packageType === 'casier' ? 'casiers' : 'cartons',
  };
}

/**
 * Calcule le nombre de casiers/cartons complets et le reliquat de bouteilles pour un produit
 */
export function calculateProductPackage(
  rawCols: number,
  productName: string = '',
  sizeOrFormat?: string,
  categoryName?: string,
  stockType?: string
): ProductPackageResult {
  const cols = Math.max(0, Number(rawCols) || 0);
  const spec = getProductPackagingSpec(productName, sizeOrFormat, categoryName, stockType);
  
  const fullPackages = Math.floor(cols / spec.unitsPerPackage);
  const remainderCols = cols % spec.unitsPerPackage;
  const fractionalPackages = Number((cols / spec.unitsPerPackage).toFixed(2));

  let formatted: string;
  let formattedCompact: string;
  let formattedDetailed: string;

  if (cols === 0) {
    formatted = `0 ${spec.shortLabel}`;
    formattedCompact = `0 ${spec.shortLabel}`;
    formattedDetailed = `0 ${spec.pluralLabel}`;
  } else if (remainderCols === 0) {
    if (fullPackages >= 1000) {
      formatted = `${(fullPackages / 1000).toFixed(1)}k ${spec.shortLabel}`;
      formattedCompact = `${(fullPackages / 1000).toFixed(1)}k ${spec.shortLabel}`;
    } else {
      formatted = `${fullPackages.toLocaleString('fr-FR')} ${spec.shortLabel}`;
      formattedCompact = `${fullPackages.toLocaleString('fr-FR')} ${spec.shortLabel}`;
    }
    formattedDetailed = `${fullPackages.toLocaleString('fr-FR')} ${fullPackages > 1 ? spec.pluralLabel : spec.singularLabel} (${spec.unitsPerPackage}x)`;
  } else {
    // Cas avec reliquat de cols
    if (fullPackages >= 1000) {
      formatted = `${(fullPackages / 1000).toFixed(1)}k ${spec.shortLabel} (+${remainderCols} cols)`;
      formattedCompact = `${(fullPackages / 1000).toFixed(1)}k ${spec.shortLabel}`;
    } else if (fullPackages > 0) {
      formatted = `${fullPackages.toLocaleString('fr-FR')} ${spec.shortLabel} (+${remainderCols} cols)`;
      formattedCompact = `${fullPackages} ${spec.shortLabel}`;
    } else {
      // Moins d'un casier/carton complet
      formatted = `${remainderCols} col${remainderCols > 1 ? 's' : ''} (${fractionalPackages} ${spec.shortLabel})`;
      formattedCompact = `${remainderCols} col${remainderCols > 1 ? 's' : ''}`;
    }
    formattedDetailed = `${fullPackages.toLocaleString('fr-FR')} ${fullPackages > 1 ? spec.pluralLabel : spec.singularLabel} pleins + ${remainderCols} col${remainderCols > 1 ? 's' : ''} restant${remainderCols > 1 ? 's' : ''}`;
  }

  return {
    rawCols: cols,
    unitsPerPackage: spec.unitsPerPackage,
    packageType: spec.packageType,
    fullPackages,
    remainderCols,
    fractionalPackages,
    formatted,
    formattedCompact,
    formattedDetailed,
    unitLabel: spec.shortLabel,
  };
}

/**
 * Agrégation intelligente par catégorie :
 * Cumule les bouteilles individuelles restantes de même conditionnement pour former
 * des casiers ou cartons complets supplémentaires, et affiche le reliquat exact.
 */
export function aggregateCategoryPackages(
  products: Array<{ volume: number; name?: string; size?: string; category?: string; format?: string }>,
  categoryName: string = 'Catégorie'
): CategoryPackageAggregate {
  if (!products || products.length === 0) {
    return {
      categoryName,
      totalCols: 0,
      totalFullPackages: 0,
      totalRemainderCols: 0,
      effectivePackages: 0,
      leftoverCols: 0,
      casiersCount: 0,
      cartonsCount: 0,
      formatted: '0 cas.',
      formattedDetailed: '0 casier',
    };
  }

  // Regroupement par calibre de conditionnement pour cumuler les reliquats
  // Clés : 'casier_12' (65cl/50cl), 'casier_24' (33cl/25cl), 'carton_6' (vins), 'carton_24' (canettes), 'carton_12'
  const buckets: Record<string, { unitsPerPackage: number; packageType: PackageType; totalCols: number }> = {
    'casier_12': { unitsPerPackage: 12, packageType: 'casier', totalCols: 0 },
    'casier_24': { unitsPerPackage: 24, packageType: 'casier', totalCols: 0 },
    'carton_6': { unitsPerPackage: 6, packageType: 'carton', totalCols: 0 },
    'carton_12': { unitsPerPackage: 12, packageType: 'carton', totalCols: 0 },
    'carton_24': { unitsPerPackage: 24, packageType: 'carton', totalCols: 0 },
  };

  let totalCols = 0;

  products.forEach((p) => {
    const vol = Math.max(0, Number(p.volume) || 0);
    totalCols += vol;
    const spec = getProductPackagingSpec(p.name, p.size || p.format, p.category || categoryName);
    const key = `${spec.packageType}_${spec.unitsPerPackage}`;
    if (!buckets[key]) {
      buckets[key] = { unitsPerPackage: spec.unitsPerPackage, packageType: spec.packageType, totalCols: 0 };
    }
    buckets[key].totalCols += vol;
  });

  let totalFullPackages = 0;
  let leftoverCols = 0;
  let casiersCount = 0;
  let cartonsCount = 0;

  Object.values(buckets).forEach((b) => {
    if (b.totalCols <= 0) return;
    const full = Math.floor(b.totalCols / b.unitsPerPackage);
    const rem = b.totalCols % b.unitsPerPackage;
    totalFullPackages += full;
    leftoverCols += rem;
    if (b.packageType === 'casier') {
      casiersCount += full;
    } else {
      cartonsCount += full;
    }
  });

  const catLower = categoryName.toLowerCase();
  const dominantUnit =
    catLower.includes('vin') || catLower.includes('spiritueux') || catLower.includes('liqueur')
      ? 'ctn'
      : casiersCount > 0 && cartonsCount > 0
      ? 'cas./ctn'
      : casiersCount > 0
      ? 'cas.'
      : 'ctn';

  let formatted: string;
  if (totalFullPackages >= 1000) {
    formatted = `${(totalFullPackages / 1000).toFixed(1)}k ${dominantUnit}${leftoverCols > 0 ? ` (+${leftoverCols} cols)` : ''}`;
  } else if (totalFullPackages > 0) {
    formatted = `${totalFullPackages.toLocaleString('fr-FR')} ${dominantUnit}${leftoverCols > 0 ? ` (+${leftoverCols} cols)` : ''}`;
  } else {
    formatted = `${leftoverCols} col${leftoverCols > 1 ? 's' : ''}`;
  }

  const formattedDetailed = `${totalFullPackages.toLocaleString('fr-FR')} emballage${totalFullPackages > 1 ? 's' : ''} formé${totalFullPackages > 1 ? 's' : ''} (${casiersCount} casiers, ${cartonsCount} cartons)${leftoverCols > 0 ? ` · ${leftoverCols} cols restant${leftoverCols > 1 ? 's' : ''}` : ''}`;

  return {
    categoryName,
    totalCols,
    totalFullPackages,
    totalRemainderCols: leftoverCols,
    effectivePackages: totalFullPackages,
    leftoverCols,
    casiersCount,
    cartonsCount,
    formatted,
    formattedDetailed,
  };
}
