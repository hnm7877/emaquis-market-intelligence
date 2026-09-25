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
  analyzedProducts: z.number().default(0),
  coveredZones: z.number().default(0),
  salesVolume: z.number().default(0),
  revenue: z.number().default(0),
  growthRate: z.number().default(0),
  demandIndex: z.number().default(0),
});

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
});

export const SalesEvolutionPointSchema = z.object({
  date: z.string(),
  salesVolume: z.number(),
  revenue: z.number(),
  demandIndex: z.number(),
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
  growth: z.number(),
  marketShare: z.number(),
});

export const TopBrandSchema = z.object({
  brand: z.string(),
  volume: z.number(),
  marketShare: z.number(),
  growth: z.number(),
});

export const MarketOverviewResponseSchema = z.object({
  kpis: MarketKpisSchema,
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
  growth: z.number(),
  demandIndex: z.number(),
  posCount: z.number(),
  latitude: z.number(),
  longitude: z.number(),
});

export const GeographyResponseSchema = z.object({
  country: z.string().default("Côte d'Ivoire"),
  totalAnalyzedPos: z.number().default(0),
  zones: z.array(GeoZoneSchema).default([]),
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
  growth: z.number(),
  rotationRate: z.number(),
  reorderFrequencyDays: z.number(),
  stockoutRisk: z.string().default('LOW'),
  topCommunes: z.array(z.string()).default([]),
});

export const ProductsResponseSchema = z.object({
  totalProducts: z.number().default(0),
  products: z.array(ProductItemSchema).default([]),
});

export const NetworkCoverageSchema = z.object({
  networkOverview: z.object({
    registeredEstablishments: z.number(),
    totalAnalyzedTransactions: z.number(),
    catalogProductsCount: z.number(),
    catalogCategoriesCount: z.number(),
    citiesCovered: z.number(),
    communesCovered: z.number(),
    dateSpanMonths: z.number(),
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
  growth: z.number().default(0),
  posPenetration: z.number().default(0),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});

export const CategoriesResponseSchema = z.object({
  totalCategories: z.number().default(0),
  categories: z.array(CategoryItemSchema).default([]),
});

export type ICategoryItem = z.infer<typeof CategoryItemSchema>;
export type ICategoriesResponse = z.infer<typeof CategoriesResponseSchema>;
