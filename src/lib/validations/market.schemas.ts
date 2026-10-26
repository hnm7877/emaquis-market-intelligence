import { z } from 'zod';

export const FilterQuerySchema = z.object({
  country: z.string().optional(),
  dateRange: z.enum(['all', '7d', '30d', '90d', '12m', 'custom']).or(z.string()).optional(),
  city: z.string().optional(),
  commune: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  posType: z.string().optional(),
});

export const MarketKpisSchema = z.object({
  activePos: z.number().default(0),
  analyzedTransactions: z.number().default(0),
  rawTotalDocuments: z.number().optional(),
  validatedTransactions: z.number().optional(),
  canceledTransactions: z.number().optional(),
  statusBreakdown: z.record(z.string(), z.number()).optional(),
  analyzedProducts: z.number().default(0),
  coveredZones: z.number().default(0),
  salesVolume: z.number().default(0),
  revenue: z.number().default(0),
  // null = indicateur non calculable (période précédente vide)
  growthRate: z.number().nullable().default(null),
  demandIndex: z.number().nullable().default(null),
  volumeGrowth: z.number().nullable().optional(),
  revenueGrowth: z.number().nullable().optional(),
  acceleration: z.number().nullable().optional(),
  posGrowth: z.number().nullable().optional(),
  transactionsGrowth: z.number().nullable().optional(),
}).passthrough();

export const MarketAlertSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  zone: z.string(),
  category: z.string(),
  variation: z.number(),
  period: z.string(),
  coveragePos: z.number(),
  confidence: z.string(),
  date: z.string().optional(),
  currentVolume: z.number().optional(),
  previousVolume: z.number().optional(),
  scope: z.string().optional(),
});

export const SalesEvolutionPointSchema = z.object({
  date: z.string(),
  salesVolume: z.number(),
  transactions: z.number().optional(),
  revenue: z.number(),
  previousDate: z.string().optional(),
  previousVolume: z.number().optional(),
  demandIndex: z.number().nullable(),
});

const ComparisonPeriodSchema = z.object({
  start: z.string(),
  end: z.string(),
  volume: z.number(),
  revenue: z.number(),
  transactions: z.number(),
  activePos: z.number(),
});

export const TopCategorySchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string().optional(),
  image: z.string().nullable().optional(),
  color: z.string().default('#f59e0b'),
  isFood: z.boolean().optional(),
  productsCount: z.number().optional(),
  volume: z.number(),
  volumeSales: z.number().optional(),
  revenue: z.number(),
  growth: z.number().nullable(),
  marketShare: z.number(),
});

export const TopBrandSchema = z.object({
  brand: z.string(),
  volume: z.number(),
  marketShare: z.number(),
  growth: z.number().nullable(),
});

export const MarketOverviewResponseSchema = z.object({
  kpis: MarketKpisSchema,
  comparison: z
    .object({
      label: z.string(),
      days: z.number(),
      current: ComparisonPeriodSchema,
      previous: ComparisonPeriodSchema,
    })
    .optional(),
  salesEvolution: z.array(SalesEvolutionPointSchema).default([]),
  topCategories: z.array(TopCategorySchema).default([]),
  topBrands: z.array(TopBrandSchema).default([]),
  topProducts: z.array(z.any()).default([]),
  alerts: z.array(MarketAlertSchema).default([]),
});

/** Origine des positions : GPS de la vente, barman sur place, épingle du patron, adresse déclarée */
export const LocationPrecisionSchema = z.object({
  sale_gps: z.number().default(0),
  barman: z.number().default(0),
  owner: z.number().default(0),
  declared: z.number().default(0),
});

export type LocationPrecision = z.infer<typeof LocationPrecisionSchema>;

export const GeoZoneSchema = z.object({
  id: z.string(),
  zone: z.string(),
  city: z.string(),
  country: z.string().default("Côte d'Ivoire"),
  volume: z.number(),
  revenue: z.number().optional(),
  growth: z.number().nullable(),
  demandIndex: z.number().nullable(),
  posCount: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  seasonalVolumes: z
    .object({ festive: z.number(), dry: z.number(), rainy: z.number() })
    .optional(),
  precision: LocationPrecisionSchema.optional(),
  /** Volume vendu par heure (0 → 23 h, fuseau Abidjan) */
  hourly: z.array(z.number()).length(24).optional(),
  /** Établissements inscrits dans la commune (avec ou sans ventes) */
  registeredPos: z.number().optional(),
});

/** Commune avec des établissements inscrits mais aucune vente sur la période */
export const WhiteZoneSchema = z.object({
  id: z.string(),
  zone: z.string(),
  city: z.string(),
  country: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  registeredPos: z.number(),
});
export type WhiteZone = z.infer<typeof WhiteZoneSchema>;

export type GeoZone = z.infer<typeof GeoZoneSchema>;

export const EstablishmentMarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  zone: z.string(),
  city: z.string(),
  country: z.string().default("Côte d'Ivoire"),
  latitude: z.number(),
  longitude: z.number(),
  hasDirectGps: z.boolean().optional(),
  positionPrecision: z.enum(['sale_gps', 'barman', 'owner', 'declared']).nullable().optional(),
  volume: z.number().default(0),
  revenue: z.number().default(0),
  transactions: z.number().default(0),
});

export type EstablishmentMarker = z.infer<typeof EstablishmentMarkerSchema>;

export const GeographyResponseSchema = z.object({
  country: z.string().default("Côte d'Ivoire"),
  totalAnalyzedPos: z.number().default(0),
  comparisonLabel: z.string().optional(),
  zones: z.array(GeoZoneSchema).default([]),
  establishments: z.array(EstablishmentMarkerSchema).optional(),
  whiteZones: z.array(WhiteZoneSchema).optional(),
  unlocated: z
    .object({ posCount: z.number(), volume: z.number(), revenue: z.number() })
    .optional(),
  locationPrecision: LocationPrecisionSchema.optional(),
});

export const ProductItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  categoryId: z.string().optional(),
  categoryImage: z.string().nullable().optional(),
  categoryColor: z.string().optional(),
  brand: z.string(),
  format: z.string().optional(),
  size: z.string().optional(),
  wineType: z.string().optional(),
  image: z.string().nullable().optional(),
  description: z.string().optional(),
  volume: z.number(),
  revenue: z.number().optional(),
  growth: z.number().nullable(),
  rotationRate: z.number(),
  posCount: z.number().optional(),
  /** Intervalle médian observé entre deux réassorts (null = pas assez d'historique) */
  reorderFrequencyDays: z.number().nullable().default(null),
  /** HIGH | MEDIUM | LOW | UNKNOWN (stock non synchronisé) */
  stockoutRisk: z.string().default('UNKNOWN'),
  unitsPerPackage: z.number().optional(),
  packageType: z.string().optional(),
  stock: z
    .object({
      trackedPos: z.number(),
      outOfStockPos: z.number(),
      lowCoverPos: z.number(),
      medianDaysCover: z.number().nullable(),
      exposedSalesShare: z.number().nullable(),
      stockoutEvents: z.number(),
      stockoutEstablishments: z.number(),
    })
    .optional(),
  pricing: z
    .object({
      avgSalePrice: z.number().nullable(),
      shelfPrice: z.object({ count: z.number(), min: z.number(), p25: z.number(), median: z.number(), p75: z.number(), max: z.number() }).nullable(),
      unitCost: z.number().nullable(),
      unitCostSource: z.string().nullable(),
      containers: z.array(
        z.object({ type: z.string(), avgPrice: z.number(), bottlesPerContainer: z.number(), lots: z.number(), establishments: z.number() }),
      ),
      purchaseLots: z.number(),
      purchaseEstablishments: z.number(),
      unitMargin: z.number().nullable(),
      marginRate: z.number().nullable(),
    })
    .optional(),
  topCommunes: z.array(z.string()).default([]),
});

export type ProductItem = z.infer<typeof ProductItemSchema>;
export type MarketAlert = z.infer<typeof MarketAlertSchema>;

/** Marque renvoyée par GET /market-intelligence/brands */
export interface BrandItem {
  id: string;
  name: string;
  key?: string;
  volume: number;
  revenue?: number;
  marketShare: number;
  growth: number | null;
  penetrationRate?: number;
  activePosCount?: number;
  totalPosCount?: number;
  fiefTerritorial?: string;
}

export const ProductsResponseSchema = z.object({
  totalProducts: z.number().default(0),
  comparisonLabel: z.string().optional(),
  analysisSpanDays: z.number().optional(),
  stockDataAvailable: z.boolean().optional(),
  methodology: z.string().optional(),
  products: z.array(ProductItemSchema).default([]),
});

export const NetworkCoverageSchema = z.object({
  networkOverview: z.object({
    registeredEstablishments: z.number(),
    activeEstablishments: z.number().optional(),
    localizedEstablishments: z.number().optional(),
    typedEstablishments: z.number().optional(),
    establishmentTypes: z
      .array(z.object({ value: z.string(), label: z.string(), count: z.number() }))
      .optional(),
    totalAnalyzedTransactions: z.number(),
    catalogProductsCount: z.number(),
    catalogCategoriesCount: z.number(),
    citiesCovered: z.number(),
    communesCovered: z.number(),
    dateSpanMonths: z.number(),
    firstSaleDate: z.string().nullable().optional(),
    lastSaleDate: z.string().nullable().optional(),
    methodology: z.string(),
  }),
});

export const DynamicFiltersSchema = z.object({
  countries: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        flag: z.string(),
        currency: z.string().optional(),
        phoneCode: z.string().optional(),
      }),
    )
    .optional(),
  dateRanges: z.array(z.object({ id: z.string(), label: z.string() })).default([]),
  cities: z.array(z.string()).default([]),
  communes: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  brands: z.array(z.string()).default([]),
  posTypes: z.array(z.string()).default([]),
});

export type IMarketOverview = z.infer<typeof MarketOverviewResponseSchema>;
export type IGeographyResponse = z.infer<typeof GeographyResponseSchema>;
export type IProductsResponse = z.infer<typeof ProductsResponseSchema>;
export type INetworkCoverage = z.infer<typeof NetworkCoverageSchema>;
export type IDynamicFilters = z.infer<typeof DynamicFiltersSchema>;

export const CategoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().default('#f59e0b'),
  image: z.string().nullable().optional(),
  isFood: z.boolean().default(false),
  session: z.string().nullable().optional(),
  productsCount: z.number().default(0),
  volume: z.number().default(0),
  revenue: z.number().default(0),
  volumeShare: z.number().default(0),
  growth: z.number().nullable().default(null),
  posPenetration: z.number().default(0),
  activePosCount: z.number().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  avgSalePrice: z.number().nullable().optional(),
  marginRate: z.number().nullable().optional(),
  marginCoverage: z.number().optional(),
  productsAtRisk: z.number().optional(),
  activeProducts: z.number().optional(),
  risingProducts: z.number().optional(),
  fallingProducts: z.number().optional(),
  leaderShare: z.number().nullable().optional(),
  topBrands: z.array(z.object({ name: z.string(), volume: z.number(), share: z.number() })).default([]),
  topProducts: z.array(z.object({ id: z.string(), name: z.string(), brand: z.string(), volume: z.number(), growth: z.number().nullable() })).default([]),
});

export const CategoriesResponseSchema = z.object({
  totalCategories: z.number().default(0),
  totalActivePos: z.number().optional(),
  comparisonLabel: z.string().optional(),
  categories: z.array(CategoryItemSchema).default([]),
});

export type ICategoryItem = z.infer<typeof CategoryItemSchema>;
export type ICategoriesResponse = z.infer<typeof CategoriesResponseSchema>;

/** Détail d'un produit (fiche) — établissements anonymisés */
export const ProductDetailSchema = z.object({
  product: z.object({ id: z.string(), name: z.string().optional(), brand: z.string().optional(), size: z.string().optional() }).nullable(),
  comparisonLabel: z.string().optional(),
  analysisSpanDays: z.number().optional(),
  sellers: z.number().default(0),
  communes: z
    .array(
      z.object({
        commune: z.string(),
        city: z.string(),
        country: z.string(),
        establishments: z.number(),
        volume: z.number(),
        avgSalePrice: z.number().nullable(),
        advisedPrice: z.number().nullable(),
        shelfMin: z.number().nullable(),
        shelfMax: z.number().nullable(),
        priceCount: z.number(),
      }),
    )
    .default([]),
  delivery: z
    .array(
      z.object({
        id: z.string(),
        commune: z.string(),
        city: z.string(),
        quantity: z.number().nullable(),
        daysCover: z.number().nullable(),
        weeklySales: z.number(),
        suggested: z.number(),
      }),
    )
    .default([]),
  history: z
    .array(
      z.object({
        month: z.string(),
        volume: z.number(),
        avgSalePrice: z.number().nullable(),
        unitCost: z.number().nullable(),
        lockerPrice: z.number().nullable(),
        cartonPrice: z.number().nullable(),
      }),
    )
    .default([]),
  purchaseChanges: z
    .array(z.object({ type: z.string(), previousAvg: z.number(), recentAvg: z.number(), changePercent: z.number(), recentLots: z.number() }))
    .default([]),
  elasticity: z.object({ coefficient: z.number(), r2: z.number(), points: z.number(), reading: z.string() }).nullable().default(null),
  scatter: z.array(z.object({ price: z.number(), weeklyVolume: z.number(), commune: z.string() })).default([]),
  simulator: z
    .object({
      avgSalePrice: z.number().nullable(),
      unitCost: z.number().nullable(),
      containers: z.array(z.object({ type: z.string(), avgPrice: z.number(), bottlesPerContainer: z.number(), lots: z.number(), establishments: z.number() })),
      weeklyVolume: z.number(),
    })
    .optional(),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

/** Marque (GET /market-intelligence/brands ou WebSocket « brands ») */
export const BrandRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    key: z.string().optional(),
    logo: z.string().nullable().optional(),
    volume: z.number().default(0),
    revenue: z.number().default(0),
    marketShare: z.number().default(0),
    growth: z.number().nullable().default(null),
    penetrationRate: z.number().default(0),
    activePosCount: z.number().default(0),
    totalPosCount: z.number().default(0),
    fiefTerritorial: z.string().nullable().optional(),
    mainZones: z.array(z.string()).default([]),
    topCategory: z.string().nullable().optional(),
    productCount: z.number().default(0),
    topProducts: z.array(z.object({ name: z.string(), volume: z.number() })).default([]),
    avgSalePrice: z.number().nullable().optional(),
    marginRate: z.number().nullable().optional(),
    marginCoverage: z.number().optional(),
    productsAtRisk: z.number().optional(),
    stockExposedShare: z.number().nullable().optional(),
    activeProducts: z.number().optional(),
    risingProducts: z.number().optional(),
    fallingProducts: z.number().optional(),
    localShares: z.array(z.object({ commune: z.string(), volume: z.number(), localShare: z.number() })).default([]),
  })
  .passthrough();
export type BrandRow = z.infer<typeof BrandRowSchema>;
export const BrandsResponseSchema = z.object({ brands: z.array(BrandRowSchema).default([]), comparisonLabel: z.string().optional() });

/** Face-à-face de produits (WebSocket « competition ») */
const PriceDuelSchema = z.object({
  a: z.string(),
  b: z.string(),
  establishments: z.number(),
  aCheaper: z.number(),
  bCheaper: z.number(),
  same: z.number(),
  avgGap: z.number().nullable(),
  aVolumeShare: z.number().nullable(),
});
export const CompetitionSchema = z.object({
  comparisonLabel: z.string().optional(),
  ids: z.array(z.string()).default([]),
  error: z.string().optional(),
  products: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        brand: z.string(),
        category: z.string(),
        image: z.string().nullable(),
        format: z.string(),
        volume: z.number(),
        revenue: z.number(),
        growth: z.number().nullable(),
        sellers: z.number(),
        rotationRate: z.number().nullable(),
        avgSalePrice: z.number().nullable(),
        shelfPrice: z.object({ count: z.number(), min: z.number(), p25: z.number(), median: z.number(), p75: z.number(), max: z.number() }).nullable(),
        unitCost: z.number().nullable(),
        marginRate: z.number().nullable(),
        stockoutRisk: z.string(),
        exposedSalesShare: z.number().nullable(),
        topCommunes: z.array(z.string()),
        shareOfDuel: z.number(),
      }),
    )
    .default([]),
  daily: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).default([]),
  hourly: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).default([]),
  overlap: z
    .object({ per: z.array(z.object({ product: z.string(), sellers: z.number(), exclusive: z.number() })), sharedByAll: z.number(), total: z.number() })
    .optional(),
  priceDuels: z.array(PriceDuelSchema).default([]),
  battles: z
    .array(z.object({ commune: z.string(), volumes: z.record(z.string(), z.number()), shares: z.record(z.string(), z.number()), leader: z.string(), margin: z.number() }))
    .default([]),
  targets: z.array(z.object({ product: z.string(), total: z.number(), communes: z.array(z.object({ commune: z.string(), count: z.number() })) })).default([]),
});
export type Competition = z.infer<typeof CompetitionSchema>;

// ==========================================
// Tendances & horaires
// ==========================================
const nnum = z.number().nullable().optional();
export const TrendsSchema = z.object({
  totalVolume: z.number().default(0),
  totalTransactions: z.number().default(0),
  totalRevenue: z.number().default(0),
  avgBasket: nnum,
  daysObserved: z.number().default(0),
  peakHours: z.array(z.string()).default([]),
  peakHoursShare: z.number().default(0),
  weekendOverWeekdayRatio: nnum,
  goldenSlot: z.object({ day: z.string(), hour: z.string(), avgVolume: z.number() }).nullable().optional(),
  momentum: z
    .object({ last7Volume: z.number(), prev7Volume: z.number(), growthPercent: nnum })
    .nullable()
    .optional(),
  dayparts: z
    .array(
      z.object({
        label: z.string(),
        volume: z.number(),
        share: z.number(),
        topProducts: z.array(z.object({ name: z.string(), volume: z.number(), share: z.number() })).default([]),
      }),
    )
    .default([]),
  daily: z.array(z.object({ date: z.string(), volume: z.number(), transactions: z.number(), revenue: z.number() })).default([]),
  byHour: z
    .array(z.object({ hour: z.string(), volume: z.number(), transactions: z.number(), share: z.number(), avgBasket: nnum }))
    .default([]),
  hourlyMatrix: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).default([]),
  hourlyProfile: z.array(z.object({ hour: z.string(), weekdayVolume: z.number(), weekendVolume: z.number() })).default([]),
  byDayOfWeek: z
    .array(
      z.object({
        day: z.string(),
        daysObserved: z.number(),
        avgDailyVolume: z.number(),
        avgDailyRevenue: z.number().default(0),
        avgBasket: nnum,
      }),
    )
    .default([]),
  monthEndEffect: z
    .object({
      monthEndAvgDailyVolume: z.number(),
      otherDaysAvgDailyVolume: z.number(),
      upliftPercent: nnum,
      monthEndDays: z.number(),
      otherDays: z.number(),
    })
    .optional(),
  monthly: z.array(z.object({ month: z.string(), volume: z.number(), transactions: z.number(), revenue: z.number().default(0) })).default([]),
  methodology: z.string().optional(),
});
export type Trends = z.infer<typeof TrendsSchema>;

// ==========================================
// STOCK INTELLIGENCE (collections globales synchronisées)
// ==========================================
const productRef = {
  productId: z.string().nullable().optional(),
  product: z.string(),
  brand: z.string().default('Non spécifié'),
};
export const StockIntelligenceSchema = z.object({
  analysisSpanDays: z.number().default(0),
  comparisonLabel: z.string().default(''),
  kpis: z
    .object({
      trackedPositions: z.number().default(0),
      establishmentsTracked: z.number().default(0),
      stockoutPositions: z.number().default(0),
      lowStockPositions: z.number().default(0),
      availabilityRate: nnum,
      stockUnits: z.number().default(0),
      stockValue: z.number().default(0),
      stockValueCoverage: z.number().default(0),
      networkDaysOfStock: nnum,
      lostUnitsPerDay: z.number().default(0),
      lostRevenuePerDay: z.number().default(0),
      stockoutEvents: z.number().default(0),
      previousStockoutEvents: z.number().default(0),
      stockoutEventsGrowth: nnum,
      restocks: z.number().default(0),
      restockUnits: z.number().default(0),
      avgRecoveryHours: nnum,
      recoveredStockouts: z.number().default(0),
    })
    .optional(),
  timeline: z.array(z.object({ date: z.string(), stockouts: z.number(), restocks: z.number(), restockUnits: z.number() })).default([]),
  brandAvailability: z
    .array(z.object({ brand: z.string(), positions: z.number(), stockoutPos: z.number(), lowStockPos: z.number(), stockValue: z.number(), availabilityRate: z.number() }))
    .default([]),
  zoneTension: z
    .array(z.object({ zone: z.string(), positions: z.number(), establishments: z.number(), stockoutPos: z.number(), stockoutRate: z.number() }))
    .default([]),
  lostSales: z.array(z.object({ ...productRef, affectedPos: z.number(), lostUnitsPerDay: z.number(), lostRevenuePerDay: z.number() })).default([]),
  overstock: z
    .array(z.object({ ...productRef, quantity: z.number(), positions: z.number(), daysOfStock: z.number(), stockValue: z.number() }))
    .default([]),
  stockoutMap: z
    .array(z.object({ zone: z.string(), city: z.string().default(''), lat: z.number(), lng: z.number(), positions: z.number(), establishments: z.number(), stockoutPos: z.number(), lowStockPos: z.number().default(0), stockoutRate: z.number() }))
    .default([]),
  forecast: z
    .object({
      horizonDays: z.number().default(3),
      positionsAtRisk: z.number().default(0),
      items: z
        .array(z.object({ ...productRef, positionsAtRisk: z.number(), minDaysLeft: z.number(), avgDaysLeft: z.number(), revenueAtRiskPerDay: z.number(), unitsPerDay: z.number(), zones: z.array(z.string()).default([]) }))
        .default([]),
    })
    .optional(),
  categoryCompetition: z
    .array(
      z.object({
        category: z.string(),
        positions: z.number(),
        categoryAvailability: z.number(),
        brands: z.array(z.object({ brand: z.string(), positions: z.number(), stockoutPos: z.number(), availabilityRate: z.number() })),
      }),
    )
    .default([]),
  criticalStockouts: z
    .array(
      z.object({
        ...productRef,
        category: z.string().default(''),
        totalPos: z.number(),
        affectedPos: z.number(),
        stockoutRate: z.number(),
        zones: z.array(z.string()).default([]),
        urgency: z.enum(['HIGH', 'MEDIUM']).catch('MEDIUM'),
      }),
    )
    .default([]),
  lowStockAlerts: z.array(z.object({ ...productRef, totalPos: z.number(), lowStockPos: z.number() })).default([]),
  stockoutEventsInPeriod: z.number().default(0),
  rotationRankings: z
    .array(z.object({ category: z.string(), rotationRate: z.number(), activePos: z.number(), volume: z.number(), daysOfStock: z.number().nullable() }))
    .default([]),
  demandSignals: z.array(z.any()).default([]),
  stockCoverage: z.object({ trackedProductPositions: z.number().default(0), lastSyncAt: z.string().nullable().optional() }).optional(),
  dataAvailability: z.object({ stockLevels: z.boolean().default(false), message: z.string().optional() }).optional(),
});
export type StockIntelligence = z.infer<typeof StockIntelligenceSchema>;

export const MyAlertsSchema = z.object({
  alertsEnabled: z.boolean(),
  alertThreshold: z.number().min(50).max(99),
  promoAlertsEnabled: z.boolean().default(true),
  competitorPromos: z
    .array(z.object({ brand: z.string(), product: z.string(), zone: z.string(), establishments: z.number(), discountPercent: nnum, startAt: z.string().nullable().optional() }))
    .default([]),
  brands: z.array(z.string()).default([]),
  breaches: z.array(z.object({ brand: z.string(), zone: z.string(), positions: z.number(), stockoutPos: z.number(), availabilityRate: z.number() })).default([]),
});
export type MyAlerts = z.infer<typeof MyAlertsSchema>;

// ==========================================
// PROMOTIONS & UPLIFT
// ==========================================
export const PromotionItemSchema = z.object({
  id: z.string(),
  title: z.string().default('Produit'),
  product: z.string().default('Produit'),
  brand: z.string().default('Non spécifié'),
  zone: z.string().default(''),
  establishmentType: z.string().nullable().optional(),
  status: z.string().default('ENDED'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  startApproximate: z.boolean().default(false),
  period: z.string().default(''),
  durationDays: z.number().default(0),
  promoPrice: z.number().default(0),
  regularPrice: z.number().default(0),
  discountPercent: nnum,
  beforeSalesDaily: z.number().default(0),
  duringSalesDaily: z.number().default(0),
  afterSalesDaily: nnum,
  upliftPercent: nnum,
  retentionPercent: nnum,
  referenceDays: z.number().default(0),
  competitorBeforeDaily: nnum,
  competitorDuringDaily: nnum,
  competitorChangePercent: nnum,
});
export type PromotionItem = z.infer<typeof PromotionItemSchema>;

const promoGroup = z.object({
  name: z.string(),
  promotions: z.number(),
  active: z.number().default(0),
  measured: z.number().default(0),
  averageUplift: nnum,
  averageDiscount: nnum,
  extraUnits: z.number().default(0),
});
export const PromotionsSchema = z.object({
  kpis: z
    .object({
      activeNow: z.number().default(0),
      ended: z.number().default(0),
      measured: z.number().default(0),
      averageUplift: nnum,
      medianUplift: nnum,
      winRate: nnum,
      averageDiscount: nnum,
      averageRetention: nnum,
      extraUnits: z.number().default(0),
      extraRevenue: z.number().default(0),
      discountCost: z.number().default(0),
      returnOnDiscount: nnum,
    })
    .optional(),
  discountEffect: z.array(z.object({ key: z.string(), label: z.string(), promotions: z.number(), averageUplift: nnum, averageRetention: nnum })).default([]),
  byBrand: z.array(promoGroup).default([]),
  byZone: z.array(promoGroup).default([]),
  timeline: z.array(z.object({ week: z.string(), started: z.number(), active: z.number() })).default([]),
  competitorReaction: z
    .object({
      measured: z.number().default(0),
      averageCompetitorChange: nnum,
      stealRate: nnum,
      byBrand: z.array(z.object({ brand: z.string(), promotions: z.number(), ownUplift: nnum, competitorChange: nnum })).default([]),
    })
    .optional(),
  launchDays: z.array(z.object({ day: z.string(), promotions: z.number(), averageUplift: nnum })).default([]),
  totalPeriods: z.number().default(0),
  averageUpliftPercent: nnum,
  measuredPromotions: z.number().default(0),
  promotions: z.array(PromotionItemSchema).default([]),
  methodology: z.string().optional(),
  dataAvailability: z.object({ available: z.boolean().default(false), syncStartedAt: z.string().nullable().optional(), message: z.string().optional() }).optional(),
});
export type Promotions = z.infer<typeof PromotionsSchema>;
