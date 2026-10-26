import { axiosInstance } from './axiosInstance';
import {
  BrandsResponseSchema,
  CompetitionSchema,
  TrendsSchema,
  StockIntelligenceSchema,
  PromotionsSchema,
  MyAlertsSchema,
  type MyAlerts,
  CategoriesResponseSchema,
  ProductDetailSchema,
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

export const buildQueryParams = (filters?: Partial<FilterState>): Record<string, string> => {
  const params: Record<string, string> = {};
  if (!filters) return params;

  const country = serializeValue(filters.country, '');
  if (country) params.country = country;

  if (filters.dateRange && filters.dateRange !== 'all') {
    if (filters.dateRange === 'custom') {
      // Dates personnalisées : envoyées seulement si le début est choisi
      if (filters.startDate) {
        params.dateRange = 'custom';
        params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
      }
    } else {
      params.dateRange = filters.dateRange;
    }
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
  const parsed = BrandsResponseSchema.safeParse(response.data);
  return parsed.success ? parsed.data : response.data;
};

/**
 * 5. Données Catégories
 */
export const fetchCategoriesData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/categories', { params });
  const parsed = CategoriesResponseSchema.safeParse(response.data);
  return parsed.success ? parsed.data : response.data;
};

/**
 * 6. Tendances de Consommation & Matrice Horaire
 */
export const fetchTrendsData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/trends', { params });
  const parsed = TrendsSchema.safeParse(response.data);
  return parsed.success ? parsed.data : response.data;
};

/**
 * 7. Stock Intelligence & Risques de rupture
 */
export const fetchStockIntelligenceData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/stock-intelligence', { params });
  const parsed = StockIntelligenceSchema.safeParse(response.data);
  return parsed.success ? parsed.data : response.data;
};

/**
 * 8. Impact Promotionnel & Uplift
 */
export const fetchPromotionsData = async (filters?: Partial<FilterState>) => {
  const params = buildQueryParams(filters);
  const response = await axiosInstance.get('/market-intelligence/promotions', { params });
  const parsed = PromotionsSchema.safeParse(response.data);
  return parsed.success ? parsed.data : response.data;
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
  const { country: _c, city: _ci, commune: _co, category: _ca, brand: _b, posType: _p, ...dates } = buildQueryParams({
    dateRange: filters?.dateRange || 'all',
    startDate: filters?.startDate,
    endDate: filters?.endDate,
  } as FilterState);
  const params: Record<string, string> = { ...dates };
  if (filters?.status) params.status = filters.status;
  const response = await axiosInstance.get('/market-intelligence/contextual-filters', { params });
  return response.data;
};
/**
 * 12. Connexion administrateur par code OTP (endpoints existants de l'API E-Maquis)
 */
export const requestAdminOtp = async (email: string): Promise<void> => {
  // Même écran pour les administrateurs E-Maquis et les distributeurs abonnés : le code est
  // demandé aux deux services, celui qui connaît l'adresse l'envoie.
  const results = await Promise.allSettled([
    axiosInstance.post('/market-intelligence/auth/request-otp', { email }),
    axiosInstance.post('/user/admin/request-otp', { email }),
  ]);
  if (results.every((r) => r.status === 'rejected')) throw (results[1] as PromiseRejectedResult).reason;
};

/** Compte distributeur (géré par les administrateurs E-Maquis) */
export interface MarketPartner {
  id: string;
  email: string;
  company: string;
  brands: string[];
  active: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export const fetchPartners = async (): Promise<MarketPartner[]> => (await axiosInstance.get('/market-intelligence/partners')).data;

export const createPartner = async (input: { email: string; company: string; brands: string[] }): Promise<MarketPartner> =>
  (await axiosInstance.post('/market-intelligence/partners', input)).data;

export const updatePartner = async (id: string, input: Partial<Pick<MarketPartner, 'company' | 'brands' | 'active'>>): Promise<MarketPartner> =>
  (await axiosInstance.patch(`/market-intelligence/partners/${encodeURIComponent(id)}`, input)).data;

// Vérification du code : faite par le serveur du site (/api/session), qui pose le cookie de session

/** Identité de la session courante (vérifie que le token donne accès à Market Intelligence) */
export const fetchMarketSession = async (): Promise<{ kind: string; subject: string; company?: string; brands?: string[]; email?: string }> => {
  const response = await axiosInstance.get('/market-intelligence/me');
  return response.data;
};

/**
 * 13. Journal d'audit et synchronisation stock / promotions
 */
export interface MarketAuditLogEntry {
  _id: string;
  subject: string;
  kind: string;
  action: string;
  endpoint: string;
  filters: Record<string, string>;
  status: string;
  created_at: string;
}

export const fetchAuditLogs = async (limit = 50): Promise<MarketAuditLogEntry[]> => {
  const response = await axiosInstance.get('/market-intelligence/audit-logs', { params: { limit } });
  return response.data;
};

export interface MarketSyncStatus {
  enabled: boolean;
  productStates: number;
  establishmentsWithStockData: number;
  lastSyncAt: string | null;
  stockMovements: number;
  promotionPeriods: number;
  activePromotions: number;
  purchaseLots?: number;
  backfill: {
    running: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    tenantsTotal: number;
    tenantsDone: number;
    productsSynced: number;
    lotsSynced?: number;
    errors: number;
  };
}

/** Détail d'un produit (fiche) : prix par commune, livraisons, historique, sensibilité */
export const fetchProductDetail = async (productId: string, filters?: Partial<FilterState>) => {
  const params = { ...buildQueryParams(filters), product: productId };
  const response = await axiosInstance.get('/market-intelligence/products/detail', { params });
  const parsed = ProductDetailSchema.safeParse(response.data);
  return parsed.success ? parsed.data : response.data;
};

/** Face-à-face de 2 à 4 produits */
export const fetchCompetition = async (ids: string[], filters?: Partial<FilterState>) => {
  const params = { ...buildQueryParams(filters), compare: ids.join(',') };
  const response = await axiosInstance.get('/market-intelligence/competition', { params });
  const parsed = CompetitionSchema.safeParse(response.data);
  return parsed.success ? parsed.data : response.data;
};

export const fetchSyncStatus = async (): Promise<MarketSyncStatus> => {
  const response = await axiosInstance.get('/market-intelligence/sync/status');
  return response.data;
};

export const startSyncBackfill = async (): Promise<MarketSyncStatus['backfill']> => {
  const response = await axiosInstance.post('/market-intelligence/sync/backfill', {});
  return response.data;
};

/** Distributeur : ses alertes de rupture par e-mail (validées par Zod) */
export const fetchMyAlerts = async (): Promise<MyAlerts> => MyAlertsSchema.parse((await axiosInstance.get('/market-intelligence/me/alerts')).data);

export const updateMyAlerts = async (input: { alertsEnabled?: boolean; alertThreshold?: number }) =>
  (await axiosInstance.patch('/market-intelligence/me/alerts', input)).data as Pick<MyAlerts, 'alertsEnabled' | 'alertThreshold'>;
