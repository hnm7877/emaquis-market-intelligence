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
import { FilterState, DynamicFiltersMetadata } from '@/types/market';

/**
 * Construit les query params à partir de l'état des filtres
 */
const buildQueryParams = (filters?: Partial<FilterState>): Record<string, string> => {
  const params: Record<string, string> = {};
  if (!filters) return params;

  if (filters.country && filters.country !== 'cote_d_ivoire' && filters.country !== 'all') {
    params.country = filters.country;
  }
  if (filters.dateRange && filters.dateRange !== '30d') {
    params.dateRange = filters.dateRange;
  }
  if (filters.city && filters.city !== 'Abidjan' && filters.city !== 'Toutes les villes') {
    params.city = filters.city;
  }
  if (filters.commune && filters.commune !== 'Toutes les communes') {
    params.commune = filters.commune;
  }
  if (filters.category && filters.category !== 'Toutes catégories') {
    params.category = filters.category;
  }
  if (filters.brand && filters.brand !== 'Toutes marques') {
    params.brand = filters.brand;
  }
  if (filters.posType && filters.posType !== 'Tous types') {
    params.posType = filters.posType;
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
export const fetchTrendsData = async () => {
  const response = await axiosInstance.get('/market-intelligence/trends');
  return response.data;
};

/**
 * 7. Stock Intelligence & Risques de rupture
 */
export const fetchStockIntelligenceData = async () => {
  const response = await axiosInstance.get('/market-intelligence/stock-intelligence');
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