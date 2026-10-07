/**
 * Analyste local « sans hallucination » : répond aux questions uniquement à partir
 * des données renvoyées par l'API Market Intelligence. Aucune valeur n'est écrite
 * en dur ; si la donnée manque, la réponse le dit.
 *
 * Temporaire en attendant le branchement de l'agent DeerFlow côté backend.
 */
import { AiChatMessage } from '@/types/market';
import { formatGrowth } from '@/utils/metrics';
import { formatVolumeValue } from '@/utils/volumeUnit';
import type { BrandItem, GeoZone, IMarketOverview, ProductItem } from '@/lib/validations/market.schemas';

export interface MarketAnalystData {
  overview?: IMarketOverview;
  products?: ProductItem[];
  brands?: BrandItem[];
  zones?: GeoZone[];
  contextSummary?: string;
}

type AnalystAnswer = Pick<AiChatMessage, 'content' | 'toolUsed' | 'sampleMetadata'>;

const INSUFFICIENT = 'Les données disponibles ne permettent pas de conclure sur ce périmètre.';

const fmt = (n?: number | null) => (typeof n === 'number' ? n.toLocaleString('fr-FR') : 'n/d');

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function buildSampleMetadata(overview?: IMarketOverview): AiChatMessage['sampleMetadata'] | undefined {
  const kpis = overview?.kpis;
  if (!kpis) return undefined;
  return {
    coverage: `${fmt(kpis.activePos)} points de vente actifs`,
    transactions: kpis.analyzedTransactions ?? 0,
    posCount: kpis.activePos ?? 0,
    period: overview?.comparison?.label ?? 'période filtrée',
  };
}

function topProducts(products: ProductItem[] = []): string {
  const list = products.filter((p) => (p.volume ?? 0) > 0).slice(0, 5);
  if (list.length === 0) return INSUFFICIENT;
  return [
    'Références les plus vendues (ventes observées dans le réseau E-Maquis) :',
    ...list.map(
      (p, i) =>
        `  ${i + 1}. ${p.name} (${p.brand}) : ${fmt(p.volume)} u., croissance ${formatGrowth(p.growth)}` +
        (p.topCommunes?.length ? `, communes principales : ${p.topCommunes.join(', ')}` : ''),
    ),
  ].join('\n');
}

function topRotation(products: ProductItem[] = []): string {
  const list = products
    .filter((p) => (p.volume ?? 0) > 0)
    .sort((a, b) => (b.rotationRate ?? 0) - (a.rotationRate ?? 0))
    .slice(0, 5);
  if (list.length === 0) return INSUFFICIENT;
  return [
    'Références à la rotation la plus rapide (unités / point de vente / semaine) :',
    ...list.map((p, i) => `  ${i + 1}. ${p.name} (${p.brand}) : ${p.rotationRate} u./POS/sem sur ${fmt(p.posCount)} POS`),
  ].join('\n');
}

function stockAnswer(products: ProductItem[] = []): string {
  const atRisk = products.filter((p) => p.stockoutRisk === 'HIGH').slice(0, 5);
  const intro =
    "Les niveaux de stock des établissements ne sont pas encore consolidés : je ne peux pas mesurer de ruptures réelles. Voici les références dont la vélocité de vente est la plus élevée (estimation de tension) :";
  if (atRisk.length === 0) return `${intro}\n  ${INSUFFICIENT}`;
  return [intro, ...atRisk.map((p, i) => `  ${i + 1}. ${p.name} (${p.brand}) : ${p.rotationRate} u./POS/sem`)].join('\n');
}

function zonesAnswer(zones: GeoZone[] = []): string {
  const list = [...zones].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 5);
  if (list.length === 0) return INSUFFICIENT;
  return [
    'Zones les plus actives en volume :',
    ...list.map(
      (z, i) =>
        `  ${i + 1}. ${z.zone} (${z.city}) : ${fmt(z.volume)} u., ${fmt(z.posCount)} POS, croissance ${formatGrowth(z.growth)}`,
    ),
  ].join('\n');
}

function brandsAnswer(brands: BrandItem[] = [], question: string): string {
  const q = normalize(question);
  const mentioned = brands.filter((b) => b.name && q.includes(normalize(b.name).split(/[\s/]+/)[0]));
  const list = (mentioned.length >= 2 ? mentioned : brands).filter((b) => (b.volume ?? 0) > 0).slice(0, 5);
  if (list.length === 0) return INSUFFICIENT;
  return [
    mentioned.length >= 2 ? 'Comparaison des marques citées :' : 'Marques les plus vendues :',
    ...list.map(
      (b) =>
        `  • ${b.name} : ${fmt(b.volume)} u. (${b.marketShare}% du volume observé), croissance ${formatGrowth(
          b.growth,
        )}, présente dans ${b.activePosCount ?? 'n/d'} POS sur ${b.totalPosCount ?? 'n/d'}` +
        (b.fiefTerritorial && b.fiefTerritorial !== 'Non établi' ? `, zone la plus forte : ${b.fiefTerritorial}` : ''),
    ),
  ].join('\n');
}

function categoriesAnswer(overview?: IMarketOverview): string {
  const list = overview?.topCategories ?? [];
  if (list.length === 0) return INSUFFICIENT;
  return [
    'Répartition par catégorie :',
    ...list.map(
      (c) => `  • ${c.category ?? c.name} : ${fmt(c.volume)} u. (${c.marketShare}%), croissance ${formatGrowth(c.growth)}`,
    ),
  ].join('\n');
}

function alertsAnswer(overview?: IMarketOverview): string {
  const alerts = overview?.alerts ?? [];
  if (alerts.length === 0) {
    return "Aucune variation significative détectée (seuil : ±20 %, au moins 3 points de vente et 30 unités sur la période précédente).";
  }
  return [
    'Signaux détectés :',
    ...alerts.map(
      (a) =>
        `  • ${a.title} — ${a.scope === 'zone' ? a.zone : a.category} : ${formatGrowth(a.variation)} (${fmt(
          a.previousVolume,
        )} → ${fmt(a.currentVolume)} u.), ${a.coveragePos} POS, confiance ${a.confidence}`,
    ),
  ].join('\n');
}

function conversionAnswer(overview?: IMarketOverview): string {
  const kpis = overview?.kpis;
  if (!kpis || !kpis.salesVolume) return INSUFFICIENT;
  const hl = formatVolumeValue(kpis.salesVolume, 'hl').fullLabel;
  const casiers = formatVolumeValue(kpis.salesVolume, 'casiers').fullLabel;
  return [
    `Volume observé : ${fmt(kpis.salesVolume)} unités.`,
    `  • ≈ ${hl}`,
    `  • ≈ ${casiers}`,
    'Conversion indicative : elle suppose des contenants de 65 cl et des casiers de 24 unités.',
  ].join('\n');
}

function synthesis(overview?: IMarketOverview): string {
  const kpis = overview?.kpis;
  if (!kpis) return INSUFFICIENT;
  return [
    'Synthèse des ventes observées dans le réseau E-Maquis :',
    `  • Transactions analysées : ${fmt(kpis.analyzedTransactions)} (${formatGrowth(kpis.transactionsGrowth)})`,
    `  • Volume : ${fmt(kpis.salesVolume)} u. (${formatGrowth(kpis.volumeGrowth)})`,
    `  • Chiffre d'affaires : ${fmt(kpis.revenue)} FCFA (${formatGrowth(kpis.revenueGrowth)})`,
    `  • Points de vente actifs : ${fmt(kpis.activePos)} (${formatGrowth(kpis.posGrowth)})`,
    `  • Indice de demande : ${kpis.demandIndex ?? 'n/d'} (base 100)`,
    overview?.comparison?.label ? `Variations : ${overview.comparison.label}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerMarketQuestion(question: string, data: MarketAnalystData): AnalystAnswer {
  const q = normalize(question);
  let content: string;
  let toolUsed: string;

  if (/(rupture|stock|reassort|tension)/.test(q)) {
    toolUsed = 'get_stock_intelligence';
    content = stockAnswer(data.products);
  } else if (/(rotation|velocite)/.test(q)) {
    toolUsed = 'get_product_performance';
    content = topRotation(data.products);
  } else if (/(hl|hectolitre|casier|litre|convert)/.test(q)) {
    toolUsed = 'get_market_overview';
    content = conversionAnswer(data.overview);
  } else if (/(alerte|anomalie|signal|hausse|baisse)/.test(q)) {
    toolUsed = 'get_market_anomalies';
    content = alertsAnswer(data.overview);
  } else if (/(marque|brand|compare|concurren|versus|\bvs\b)/.test(q)) {
    toolUsed = 'get_brand_performance';
    content = brandsAnswer(data.brands, question);
  } else if (/(zone|commune|ville|quartier|hotspot|geograph|chaud)/.test(q)) {
    toolUsed = 'get_geographic_performance';
    content = zonesAnswer(data.zones);
  } else if (/(categorie)/.test(q)) {
    toolUsed = 'get_category_performance';
    content = categoriesAnswer(data.overview);
  } else if (/(produit|sku|reference|vend)/.test(q)) {
    toolUsed = 'get_product_performance';
    content = topProducts(data.products);
  } else {
    toolUsed = 'get_market_overview';
    content = synthesis(data.overview);
  }

  if (data.contextSummary) content += `\n\nPérimètre : ${data.contextSummary}.`;

  return { content, toolUsed, sampleMetadata: buildSampleMetadata(data.overview) };
}

/** Questions suggérées (sans aucun chiffre pré-rempli) */
export const SUGGESTED_QUESTIONS = [
  'Quels sont les 5 produits les plus vendus et dans quelles communes ?',
  'Quelles sont les zones les plus actives en volume ?',
  'Quels signaux de hausse ou de baisse observes-tu ?',
  'Quels produits ont la rotation la plus rapide ?',
  'Compare les principales marques sur ce périmètre.',
  'Convertir le volume observé en hectolitres et en casiers.',
];
