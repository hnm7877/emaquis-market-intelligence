import { axiosInstance } from './axiosInstance';
import {
  MarketOverviewResponseSchema,
  GeographyResponseSchema,
  ProductsResponseSchema,
  NetworkCoverageSchema,
  IMarketOverview,
  IGeographyResponse,
  IProductsResponse,
  INetworkCoverage,
} from '@/lib/validations/market.schemas';
import { FilterState, DynamicFiltersMetadata, ContextualFiltersData } from '@/types/market';

/**
 * Construit les query params à partir de l'état des filtres
 */
const serializeValue = (val: any, defaultLabel = ''): string | undefined => {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    const valid = val.filter(
      (item) => item && !String(item).toLowerCase().startsWith('tout') && item !== 'all' && item !== defaultLabel
    );
    return valid.length > 0 ? valid.join(',') : undefined;
  }
  if (
    typeof val === 'string' &&
    !val.toLowerCase().startsWith('tout') &&
    val !== 'all' &&
    val !== defaultLabel
  ) {
    return val;
  }
  return undefined;
};

const buildQueryParams = (filters?: Partial<FilterState>): Record<string, string> => {
  const params: Record<string, string> = {};
  if (!filters) return params;

  const country = serializeValue(filters.country, '');
  if (country) params.country = country;

  if (filters.dateRange && filters.dateRange !== 'all') {
    params.dateRange = filters.dateRange;
  }

  const city = serializeValue(filters.city, 'Toutes les villes');
  if (city) params.city = city;

  const commune = serializeValue(filters.commune, 'Toutes les communes');
  if (commune) params.commune = commune;

  const category = serializeValue(filters.category, 'Toutes catégories');
  if (category) params.category = category;

  const brand = serializeValue(filters.brand, 'Toutes marques');
  if (brand) params.brand = brand;

  const posType = serializeValue(filters.posType, 'Tous types');
  if (posType) params.posType = posType;

  if (filters.status && filters.status !== 'valid') {
    params.status = filters.status;
  }

  return params;
};

/**
 * 1. Overview & KPIs
 */
export const fetchMarketOverview = async (filters?: Partial<FilterState>): Promise<IMarketOverview> => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/overview', { params });
  
  const parsed = MarketOverviewResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    console.warn('[ZOD VALIDATION WARNING] Overview response:', parsed.error);
    return response.data;
  }
  return parsed.data;
};

/**
 * 2. Données Géographiques
 */
export const fetchGeographyData = async (filters?: Partial<FilterState>): Promise<IGeographyResponse> => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/geography', { params });

  const parsed = GeographyResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    console.warn('[ZOD VALIDATION WARNING] Geography response:', parsed.error);
    return response.data;
  }
  return parsed.data;
};

/**
 * 3. Données Produits avec images Produitglobal
 */
export const fetchProductsData = async (filters?: Partial<FilterState>): Promise<IProductsResponse> => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/products', { params });

  const parsed = ProductsResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    console.warn('[ZOD VALIDATION WARNING] Products response:', parsed.error);
    return response.data;
  }
  return parsed.data;
};

/**
 * 4. Données Marques
 */
export const fetchBrandsData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/brands', { params });
  return response.data;
};

/**
 * 5. Données Catégories
 */
export const fetchCategoriesData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/categories', { params });
  return response.data;
};

/**
 * 6. Tendances de Consommation & Matrice Horaire
 */
export const fetchTrendsData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/trends', { params });
  return response.data;
};

/**
 * 7. Stock Intelligence & Risques de rupture
 */
export const fetchStockIntelligenceData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/stock-intelligence', { params });
  return response.data;
};

/**
 * 8. Impact Promotionnel & Uplift
 */
export const fetchPromotionsData = async () => {
  const response = await axiosInstance.get('/market-intelligence/promotions');
  return response.data;
};

/**
 * 9. Couverture Réelle du Réseau
 */
export const fetchDataCoverage = async (): Promise<INetworkCoverage> => {
  const response = await axiosInstance.get('/market-intelligence/data-coverage');
  
  const parsed = NetworkCoverageSchema.safeParse(response.data);
  if (!parsed.success) {
    console.warn('[ZOD VALIDATION WARNING] Coverage response:', parsed.error);
    return response.data;
  }
  return parsed.data;
};

/**
 * 10. Métadonnées dynamiques des Filtres (pays, villes, communes, catégories, marques)
 */
export const fetchFiltersMetadata = async (): Promise<DynamicFiltersMetadata> => {
  const response = await axiosInstance.get('/market-intelligence/filters');
  return response.data;
};
/**
 * 11. Filtres contextuels dynamiques (suggestions basees sur le statut/periode courant)
 */
export const fetchContextualFilters = async (filters?: Partial<FilterState>): Promise<ContextualFiltersData> => {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.dateRange && filters.dateRange !== 'all') params.dateRange = filters.dateRange;
  const response = await axiosInstance.get('/market-intelligence/contextual-filters', { params });
  return response.data;
};