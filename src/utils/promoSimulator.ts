import type { PromotionItem } from '@/lib/validations/market.schemas';

export interface SimulationInput {
  brand: string | null;
  discountPercent: number;
  durationDays: number;
}

export interface SimulationResult {
  /** Promotions passées utilisées pour l'estimation */
  sample: number;
  /** true si la marque avait assez d'historique, sinon estimation réseau toutes marques */
  brandSpecific: boolean;
  expectedUplift: number;
  baselineDaily: number;
  extraUnits: number;
  extraRevenue: number;
  discountCost: number;
  confidence: 'faible' | 'moyenne' | 'bonne';
}

const MIN_BRAND_SAMPLE = 3;
/** Écart de remise toléré pour juger deux promos comparables (points de %) */
const DISCOUNT_WINDOW = 8;

/**
 * Simulateur de promotion : estime le gain d'une remise à partir des promotions passées
 * comparables (même marque si assez d'historique, remise proche). Calcul local, aucune requête.
 * Les promos les plus proches en remise pèsent davantage.
 */
export function simulatePromotion(promos: PromotionItem[], input: SimulationInput): SimulationResult | null {
  const measured = promos.filter((p) => p.upliftPercent != null && p.discountPercent != null && p.beforeSalesDaily > 0);
  const near = (rows: PromotionItem[]) => rows.filter((p) => Math.abs((p.discountPercent as number) - input.discountPercent) <= DISCOUNT_WINDOW);
  const ofBrand = input.brand ? near(measured.filter((p) => p.brand === input.brand)) : [];
  const brandSpecific = ofBrand.length >= MIN_BRAND_SAMPLE;
  const rows = brandSpecific ? ofBrand : near(measured);
  if (!rows.length) return null;

  let wSum = 0;
  let uplift = 0;
  let baseline = 0;
  let regular = 0;
  for (const p of rows) {
    const w = 1 / (1 + Math.abs((p.discountPercent as number) - input.discountPercent));
    wSum += w;
    uplift += w * (p.upliftPercent as number);
    baseline += w * p.beforeSalesDaily;
    regular += w * (p.regularPrice || 0);
  }
  const expectedUplift = Math.round((uplift / wSum) * 10) / 10;
  const baselineDaily = Math.round((baseline / wSum) * 10) / 10;
  const regularPrice = regular / wSum;
  const promoPrice = regularPrice * (1 - input.discountPercent / 100);
  const days = Math.max(1, Math.min(90, Math.round(input.durationDays)));
  const duringDaily = baselineDaily * (1 + expectedUplift / 100);
  const extraUnits = Math.max(0, (duringDaily - baselineDaily) * days);
  return {
    sample: rows.length,
    brandSpecific,
    expectedUplift,
    baselineDaily,
    extraUnits: Math.round(extraUnits),
    extraRevenue: Math.round(extraUnits * promoPrice),
    discountCost: Math.round((regularPrice - promoPrice) * duringDaily * days),
    confidence: rows.length >= 10 ? 'bonne' : rows.length >= 4 ? 'moyenne' : 'faible',
  };
}
