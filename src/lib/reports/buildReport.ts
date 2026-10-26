import type {
  BrandRow,
  IGeographyResponse,
  IMarketOverview,
  ProductItem,
  Promotions,
  StockIntelligence,
  Trends,
} from '@/lib/validations/market.schemas';

export type ReportSectionId = 'overview' | 'brands' | 'products' | 'geography' | 'trends' | 'stock' | 'promotions';

export const SECTION_LABELS: Record<ReportSectionId, string> = {
  overview: "Vue d'ensemble",
  brands: 'Marques',
  products: 'Produits',
  geography: 'Communes',
  trends: 'Tendances & horaires',
  stock: 'Stock & ruptures',
  promotions: 'Promotions',
};

export interface ReportKpi {
  label: string;
  value: string;
  hint?: string;
}

export interface ReportTable {
  columns: string[];
  /** Valeurs brutes (nombres gardés en nombre pour Excel) */
  rows: (string | number | null)[][];
  /** Lignes à mettre en avant (marques suivies) */
  highlight?: boolean[];
}

export interface ReportSection {
  id: ReportSectionId;
  title: string;
  kpis: ReportKpi[];
  /** Constats calculés à partir des chiffres (aucun texte inventé) */
  highlights: string[];
  table?: ReportTable;
  chart?: { label: string; value: number }[];
}

export interface ReportData {
  overview?: IMarketOverview;
  brands?: BrandRow[];
  products?: ProductItem[];
  geography?: IGeographyResponse;
  trends?: Trends;
  stock?: StockIntelligence;
  promotions?: Promotions;
}

const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const money = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n).toLocaleString('fr-FR')} F`);
const pct = (n: number | null | undefined, signed = true) => (n == null ? '—' : `${signed && n > 0 ? '+' : ''}${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`);
const lc = (s: string) => s.trim().toLowerCase();

function overview(d: IMarketOverview): ReportSection {
  const k = d.kpis;
  const highlights: string[] = [];
  if (k.revenueGrowth != null) highlights.push(`Chiffre d'affaires ${k.revenueGrowth >= 0 ? 'en hausse' : 'en baisse'} de ${pct(Math.abs(k.revenueGrowth), false)} par rapport à la période précédente.`);
  if (d.topBrands[0]) highlights.push(`${d.topBrands[0].brand} est la première marque en volume (${pct(d.topBrands[0].marketShare, false)} de part de marché).`);
  if (d.topCategories[0]) highlights.push(`Catégorie la plus vendue : ${d.topCategories[0].category} (${pct(d.topCategories[0].marketShare, false)} des volumes).`);
  return {
    id: 'overview',
    title: SECTION_LABELS.overview,
    kpis: [
      { label: "Chiffre d'affaires", value: money(k.revenue), hint: pct(k.revenueGrowth ?? null) },
      { label: 'Unités vendues', value: int(k.salesVolume), hint: pct(k.volumeGrowth ?? null) },
      { label: 'Ventes', value: int(k.analyzedTransactions), hint: pct(k.transactionsGrowth ?? null) },
      { label: 'Points de vente actifs', value: int(k.activePos), hint: `${int(k.coveredZones)} zones` },
    ],
    highlights,
    chart: d.salesEvolution.slice(-30).map((p) => ({ label: p.date.length >= 10 ? `${p.date.slice(8, 10)}/${p.date.slice(5, 7)}` : p.date, value: p.salesVolume })),
  };
}

function brands(rows: BrandRow[], own: Set<string>): ReportSection {
  const top = [...rows].sort((a, b) => b.volume - a.volume).slice(0, 15);
  const highlights: string[] = [];
  const rising = rows.filter((b) => b.growth != null && b.volume > 0).sort((a, b) => (b.growth as number) - (a.growth as number))[0];
  if (top[0]) highlights.push(`${top[0].name} domine avec ${pct(top[0].marketShare, false)} des volumes.`);
  if (rising && (rising.growth as number) > 0) highlights.push(`Plus forte progression : ${rising.name} (${pct(rising.growth)}).`);
  rows.filter((b) => own.has(lc(b.name))).forEach((b) => {
    const rank = [...rows].sort((x, y) => y.volume - x.volume).findIndex((x) => x.name === b.name) + 1;
    highlights.push(`${b.name} : ${rank}e marque, ${pct(b.marketShare, false)} de part, présente dans ${pct(b.penetrationRate, false)} des points de vente.`);
  });
  return {
    id: 'brands',
    title: SECTION_LABELS.brands,
    kpis: [{ label: 'Marques suivies', value: int(rows.length) }],
    highlights,
    table: {
      columns: ['Marque', 'Unités', "Chiffre d'affaires (F)", 'Part (%)', 'Évolution (%)', 'Pénétration (%)', 'Zone forte'],
      rows: top.map((b) => [b.name, b.volume, b.revenue, b.marketShare, b.growth, b.penetrationRate, b.fiefTerritorial ?? '']),
      highlight: top.map((b) => own.has(lc(b.name))),
    },
    chart: top.slice(0, 8).map((b) => ({ label: b.name, value: b.marketShare })),
  };
}

function products(rows: ProductItem[], own: Set<string>): ReportSection {
  const mine = own.size ? rows.filter((p) => own.has(lc(p.brand))) : [];
  const base = mine.length ? mine : rows;
  const top = [...base].sort((a, b) => b.volume - a.volume).slice(0, 20);
  const highlights: string[] = [];
  if (top[0]) highlights.push(`Référence n°1${mine.length ? ' de vos marques' : ''} : ${top[0].name} (${int(top[0].volume)} unités).`);
  const falling = base.filter((p) => p.growth != null && p.volume > 0 && (p.growth as number) <= -20).length;
  if (falling) highlights.push(`${falling} référence(s) en baisse de plus de 20 % à surveiller.`);
  return {
    id: 'products',
    title: mine.length ? 'Produits de vos marques' : SECTION_LABELS.products,
    kpis: [{ label: 'Références analysées', value: int(base.length) }],
    highlights,
    table: {
      columns: ['Produit', 'Marque', 'Catégorie', 'Unités', "Chiffre d'affaires (F)", 'Évolution (%)', 'Rotation (u./POS/sem.)'],
      rows: top.map((p) => [p.name, p.brand, p.category, p.volume, p.revenue ?? null, p.growth, p.rotationRate]),
      highlight: top.map((p) => own.has(lc(p.brand))),
    },
  };
}

function geography(g: IGeographyResponse): ReportSection {
  const top = [...g.zones].sort((a, b) => b.volume - a.volume).slice(0, 15);
  const highlights: string[] = [];
  if (top[0]) highlights.push(`${top[0].zone} (${top[0].city}) est la commune la plus active : ${int(top[0].volume)} unités, ${int(top[0].posCount)} points de vente.`);
  const growing = g.zones.filter((z) => z.growth != null && z.volume > 0).sort((a, b) => (b.growth as number) - (a.growth as number))[0];
  if (growing && (growing.growth as number) > 0) highlights.push(`Plus forte croissance : ${growing.zone} (${pct(growing.growth)}).`);
  if (g.whiteZones?.length) highlights.push(`${g.whiteZones.length} zone(s) avec des établissements inscrits sans vente sur la période : potentiel à prospecter.`);
  return {
    id: 'geography',
    title: SECTION_LABELS.geography,
    kpis: [
      { label: 'Communes', value: int(g.zones.length) },
      { label: 'Points de vente analysés', value: int(g.totalAnalyzedPos) },
    ],
    highlights,
    table: {
      columns: ['Commune', 'Ville', 'Unités', "Chiffre d'affaires (F)", 'Évolution (%)', 'Points de vente'],
      rows: top.map((z) => [z.zone, z.city, z.volume, z.revenue ?? null, z.growth, z.posCount]),
    },
    chart: top.slice(0, 10).map((z) => ({ label: z.zone, value: z.volume })),
  };
}

function trends(t: Trends): ReportSection {
  const highlights: string[] = [];
  if (t.goldenSlot) highlights.push(`Moment le plus fort : ${t.goldenSlot.day} ${t.goldenSlot.hour}.`);
  if (t.peakHours.length) highlights.push(`Heures de pointe : ${t.peakHours.slice(0, 3).join(', ')} (${pct(t.peakHoursShare, false)} des volumes).`);
  if (t.weekendOverWeekdayRatio != null) highlights.push(`Le week-end vend ${t.weekendOverWeekdayRatio.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} fois plus par jour que la semaine.`);
  if (t.momentum?.growthPercent != null) highlights.push(`7 derniers jours : ${pct(t.momentum.growthPercent)} par rapport aux 7 précédents.`);
  return {
    id: 'trends',
    title: SECTION_LABELS.trends,
    kpis: [
      { label: 'Panier moyen', value: money(t.avgBasket ?? null) },
      { label: 'Jours observés', value: int(t.daysObserved) },
    ],
    highlights,
    table: {
      columns: ['Jour', 'Unités / jour', "Chiffre d'affaires / jour (F)", 'Jours observés'],
      rows: t.byDayOfWeek.map((d) => [d.day, d.avgDailyVolume, d.avgDailyRevenue, d.daysObserved]),
    },
    chart: t.byDayOfWeek.map((d) => ({ label: d.day.slice(0, 3), value: d.avgDailyVolume })),
  };
}

function stock(s: StockIntelligence, own: Set<string>): ReportSection {
  const k = s.kpis;
  const highlights: string[] = [];
  if (k?.availabilityRate != null) highlights.push(`Disponibilité du réseau : ${pct(k.availabilityRate, false)} (${int(k.stockoutPositions)} produits en rupture).`);
  if (k?.lostRevenuePerDay) highlights.push(`Ventes manquées estimées : ${money(k.lostRevenuePerDay)} par jour.`);
  if (s.forecast?.positionsAtRisk) highlights.push(`${int(s.forecast.positionsAtRisk)} ruptures attendues d'ici ${s.forecast.horizonDays} jours.`);
  s.brandAvailability.filter((b) => own.has(lc(b.brand))).forEach((b) => highlights.push(`${b.brand} : ${pct(b.availabilityRate, false)} de disponibilité.`));
  return {
    id: 'stock',
    title: SECTION_LABELS.stock,
    kpis: k
      ? [
          { label: 'Disponibilité', value: pct(k.availabilityRate ?? null, false) },
          { label: 'Ruptures', value: int(k.stockoutPositions) },
          { label: 'Ventes manquées / jour', value: money(k.lostRevenuePerDay) },
          { label: 'Couverture', value: k.networkDaysOfStock == null ? '—' : `${k.networkDaysOfStock} j` },
        ]
      : [],
    highlights,
    table: {
      columns: ['Marque', 'Disponibilité (%)', 'En rupture', 'Positions suivies', 'Sous le seuil'],
      rows: s.brandAvailability.map((b) => [b.brand, b.availabilityRate, b.stockoutPos, b.positions, b.lowStockPos]),
      highlight: s.brandAvailability.map((b) => own.has(lc(b.brand))),
    },
  };
}

function promotions(p: Promotions, own: Set<string>): ReportSection {
  const k = p.kpis;
  const highlights: string[] = [];
  if (k?.averageUplift != null) highlights.push(`Une promotion fait vendre en moyenne ${pct(k.averageUplift)} (${k.measured} mesurées, ${pct(k.winRate ?? null, false)} réussies).`);
  if (k?.returnOnDiscount != null) highlights.push(`Chaque franc de remise a rapporté ${k.returnOnDiscount.toLocaleString('fr-FR')} F de ventes supplémentaires.`);
  const best = p.discountEffect.filter((b) => b.promotions >= 2 && b.averageUplift != null).sort((a, b) => (b.averageUplift as number) - (a.averageUplift as number))[0];
  if (best) highlights.push(`Remise la plus efficace : ${best.label} (${pct(best.averageUplift ?? null)}).`);
  return {
    id: 'promotions',
    title: SECTION_LABELS.promotions,
    kpis: k
      ? [
          { label: 'En cours', value: int(k.activeNow) },
          { label: 'Uplift moyen', value: pct(k.averageUplift ?? null) },
          { label: 'Ventes gagnées', value: money(k.extraRevenue) },
          { label: 'Rendement remise', value: k.returnOnDiscount == null ? '—' : `× ${k.returnOnDiscount}` },
        ]
      : [],
    highlights,
    table: {
      columns: ['Marque', 'Promotions', 'En cours', 'Uplift moyen (%)', 'Remise moyenne (%)', 'Unités gagnées'],
      rows: p.byBrand.map((b) => [b.name, b.promotions, b.active, b.averageUplift ?? null, b.averageDiscount ?? null, b.extraUnits]),
      highlight: p.byBrand.map((b) => own.has(lc(b.name))),
    },
  };
}

/** Assemble les sections demandées dans l'ordre choisi ; une section sans données est omise. */
export function buildReport(data: ReportData, sections: ReportSectionId[], ownBrands: string[]): ReportSection[] {
  const own = new Set(ownBrands.map(lc));
  const out: ReportSection[] = [];
  for (const id of sections) {
    if (id === 'overview' && data.overview) out.push(overview(data.overview));
    if (id === 'brands' && data.brands?.length) out.push(brands(data.brands, own));
    if (id === 'products' && data.products?.length) out.push(products(data.products, own));
    if (id === 'geography' && data.geography?.zones.length) out.push(geography(data.geography));
    if (id === 'trends' && data.trends) out.push(trends(data.trends));
    if (id === 'stock' && data.stock?.dataAvailability?.stockLevels) out.push(stock(data.stock, own));
    if (id === 'promotions' && data.promotions?.promotions.length) out.push(promotions(data.promotions, own));
  }
  return out;
}
