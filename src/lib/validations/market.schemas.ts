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
});

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
  reorderFrequencyDays: z.number(),
  stockoutRisk: z.string().default('LOW'),
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
  methodology: z.string().optional(),
  products: z.array(ProductItemSchema).default([]),
});

export const NetworkCoverageSchema = z.object({
  networkOverview: z.object({
    registeredEstablishments: z.number(),
    activeEstablishments: z.number().optional(),
    localizedEstablishments: z.number().optional(),
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
});

export const CategoriesResponseSchema = z.object({
  totalCategories: z.number().default(0),
  categories: z.array(CategoryItemSchema).default([]),
});

export type ICategoryItem = z.infer<typeof CategoryItemSchema>;
export type ICategoriesResponse = z.infer<typeof CategoriesResponseSchema>;
