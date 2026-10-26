import type { ZodType } from 'zod';
import {
  CompetitionSchema,
  CategoriesResponseSchema,
  BrandsResponseSchema,
  GeographyResponseSchema,
  MarketOverviewResponseSchema,
  NetworkCoverageSchema,
  ProductDetailSchema,
  ProductsResponseSchema,
  TrendsSchema,
  StockIntelligenceSchema,
} from '@/lib/validations/market.schemas';
import type { LiveResource } from './liveData';

/**
 * Mêmes contrôles Zod que les réponses HTTP, appliqués aux données reçues par WebSocket
 * (même comportement : en cas d'écart, la donnée brute est conservée et signalée en dev).
 */
const SCHEMAS: Partial<Record<LiveResource, ZodType>> = {
  overview: MarketOverviewResponseSchema,
  geography: GeographyResponseSchema,
  products: ProductsResponseSchema,
  coverage: NetworkCoverageSchema,
  productDetail: ProductDetailSchema,
  brands: BrandsResponseSchema,
  categories: CategoriesResponseSchema,
  competition: CompetitionSchema,
  trends: TrendsSchema,
  stock: StockIntelligenceSchema,
};

export function validateLive<T>(resource: LiveResource, data: unknown): T {
  const schema = SCHEMAS[resource];
  if (!schema || data == null) return data as T;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.warn(`[ZOD VALIDATION WARNING] Direct ${resource}:`, parsed.error);
    return data as T;
  }
  return parsed.data as T;
}
