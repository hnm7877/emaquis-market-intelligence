'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  fetchMarketOverview,
  fetchGeographyData,
  fetchProductsData,
  fetchBrandsData,
  fetchCategoriesData,
  fetchTrendsData,
  fetchStockIntelligenceData,
  fetchPromotionsData,
  fetchDataCoverage,
  fetchFiltersMetadata,
  fetchContextualFilters,
  fetchAuditLogs,
  fetchSyncStatus,
  fetchProductDetail,
  fetchProductCandles,
  fetchCompetition,
  fetchMarketSession,
  buildQueryParams,
} from '@/api/marketIntelligence.api';
import { firstLiveValue, isLiveConnected, waitForLive, liveFilters, liveKey, subscribeLive, type LiveResource } from '@/api/liveData';
import { validateLive } from '@/api/liveSchemas';
import type { FilterState } from '@/types/market';
import type { Promotions, StockIntelligence } from '@/lib/validations/market.schemas';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { getMarketSocket } from '@/api/socket';
import type { MarketPulse } from '@/stores/useMarketRealtimeStore';

/**
 * Temps réel exclusivement par WebSocket : aucune requête HTTP périodique. Si le direct est
 * coupé, socket.io se reconnecte tout seul et le serveur repousse les vues suivies.
 */
const fallbackInterval = false as const;

export const marketQueryKeys = {
  all: ['market'] as const,
  overview: (filters: any) => [...marketQueryKeys.all, 'overview', filters] as const,
  geography: (filters: any) => [...marketQueryKeys.all, 'geography', filters] as const,
  products: (filters: any) => [...marketQueryKeys.all, 'products', filters] as const,
  brands: (filters?: any) => [...marketQueryKeys.all, 'brands', filters] as const,
  categories: (filters?: any) => [...marketQueryKeys.all, 'categories', filters] as const,
  trends: (filters?: unknown) => [...marketQueryKeys.all, 'trends', filters] as const,
  stock: (filters?: unknown) => [...marketQueryKeys.all, 'stock', filters] as const,
  promotions: (filters?: unknown) => [...marketQueryKeys.all, 'promotions', filters] as const,
  auditLogs: () => [...marketQueryKeys.all, 'audit-logs'] as const,
  syncStatus: () => [...marketQueryKeys.all, 'sync-status'] as const,
  coverage: () => [...marketQueryKeys.all, 'coverage'] as const,
  filtersMetadata: () => [...marketQueryKeys.all, 'filters-metadata'] as const,
  contextualFilters: (status: string, dateRange: string, startDate?: string, endDate?: string) =>
    [...marketQueryKeys.all, 'contextual-filters', status, dateRange, startDate ?? '', endDate ?? ''] as const,
};

/**
 * Donnée en direct : React Query garde le cache, le WebSocket le remplit.
 * - Direct actif : la première valeur arrive par le WebSocket (aucune requête HTTP), puis le
 *   serveur pousse les nouveaux chiffres quand des ventes arrivent (setQueryData).
 * - Direct coupé : requête HTTP classique, puis secours toutes les 60 s jusqu'au retour du direct.
 * Les données ne deviennent jamais « périmées » d'elles-mêmes : c'est le serveur qui décide.
 */
function useLiveQuery<T>(
  resource: LiveResource,
  params: Record<string, string>,
  queryKey: readonly unknown[],
  fetcher: () => Promise<T>,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const filters = liveFilters(params);
  const subKey = liveKey(resource, filters);
  const cacheKey = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;
    const key = JSON.parse(cacheKey);
    return subscribeLive(resource, JSON.parse(subKey.slice(resource.length + 1)), (data) =>
      queryClient.setQueryData(key, validateLive<T>(resource, data)),
    );
  }, [enabled, resource, subKey, cacheKey, queryClient]);

  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      // Premier chargement : on laisse au direct le temps de se connecter avant de passer en HTTP
      if (isLiveConnected() || (await waitForLive())) {
        const pushed = await firstLiveValue<T>(resource, filters);
        if (pushed !== null) return validateLive<T>(resource, pushed);
      }
      return fetcher();
    },
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: fallbackInterval,
    retry: 1,
  });
}

/** 1. Vue d'ensemble (KPIs) — poussée toutes les 5 s au plus quand des ventes arrivent */
export function useMarketOverview(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('overview', buildQueryParams(filters), marketQueryKeys.overview(filters), () => fetchMarketOverview(filters), enabled);
}

/** 2. Données géographiques (anonymisées) */
export function useGeographyQuery(enabled = true, overrides?: Partial<FilterState>) {
  const stored = useMarketFilterStore((state) => state.filters);
  // Surcharge locale d'une page (ex. : carte « tous les pays ») sans toucher au filtre global
  const filters = useMemo(() => (overrides ? { ...stored, ...overrides } : stored), [stored, overrides]);
  return useLiveQuery('geography', buildQueryParams(filters), marketQueryKeys.geography(filters), () => fetchGeographyData(filters), enabled);
}

/** 3. Produits (images Produitglobal) */
export function useProductsQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('products', buildQueryParams(filters), marketQueryKeys.products(filters), () => fetchProductsData(filters), enabled);
}

/** 4. Marques */
export function useBrandsQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('brands', buildQueryParams(filters), marketQueryKeys.brands(filters), () => fetchBrandsData(filters), enabled);
}

/** Détail d'un produit : abonnement ouvert seulement quand sa fiche est affichée */
export function useProductDetailQuery(productId: string | null) {
  const filters = useMarketFilterStore((state) => state.filters);
  const id = productId || '';
  return useLiveQuery(
    'productDetail',
    { ...buildQueryParams(filters), product: id },
    [...marketQueryKeys.all, 'product-detail', id, filters],
    () => fetchProductDetail(id, filters),
    !!productId,
  );
}

/** Face-à-face de produits : abonnement ouvert seulement avec au moins deux produits choisis */
/** Bourse produit : bougies de prix réels (poussées en direct) */
export function useProductCandlesQuery(productId: string | null, interval: string) {
  const filters = useMarketFilterStore((state) => state.filters);
  const id = productId || '';
  return useLiveQuery(
    'candles',
    { ...buildQueryParams(filters), product: id, interval },
    [...marketQueryKeys.all, 'candles', id, interval, filters],
    () => fetchProductCandles(id, interval, filters),
    !!productId,
  );
}

export function useCompetitionQuery(ids: string[]) {
  const filters = useMarketFilterStore((state) => state.filters);
  const compare = ids.join(',');
  return useLiveQuery(
    'competition',
    { ...buildQueryParams(filters), compare },
    [...marketQueryKeys.all, 'competition', compare, filters],
    () => fetchCompetition(ids, filters),
    ids.length >= 2,
  );
}

/** 5. Catégories */
export function useCategoriesQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('categories', buildQueryParams(filters), marketQueryKeys.categories(filters), () => fetchCategoriesData(filters), enabled);
}

/** 6. Tendances de consommation */
export function useTrendsQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('trends', buildQueryParams(filters), marketQueryKeys.trends(filters), () => fetchTrendsData(filters), enabled);
}

/** 7. Stock intelligence */
export function useStockIntelligenceQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery<StockIntelligence>('stock', buildQueryParams(filters), marketQueryKeys.stock(filters), () => fetchStockIntelligenceData(filters) as Promise<StockIntelligence>, enabled);
}

/** 8. Impact des promotions */
export function usePromotionsQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery<Promotions>('promotions', buildQueryParams(filters), marketQueryKeys.promotions(filters), () => fetchPromotionsData(filters) as Promise<Promotions>, enabled);
}

/** 9. Couverture réseau */
export function useDataCoverageQuery() {
  return useLiveQuery('coverage', {}, marketQueryKeys.coverage(), fetchDataCoverage);
}

/** 10. Filtres dynamiques (villes, communes, catégories, marques) */
export function useMarketFiltersQuery() {
  return useLiveQuery('filters', {}, marketQueryKeys.filtersMetadata(), fetchFiltersMetadata);
}

/** 11. Filtres contextuels (selon statut / période) */
export function useContextualFiltersQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  const status = filters.status || 'valid';
  const dateRange = filters.dateRange || 'all';
  const { startDate, endDate } = filters;
  const params: Record<string, string> = { ...buildQueryParams({ dateRange, startDate, endDate } as never), status };
  return useLiveQuery('contextual', params, marketQueryKeys.contextualFilters(status, dateRange, startDate, endDate), () =>
    fetchContextualFilters({ status, dateRange, startDate, endDate }),
    enabled,
  );
}

/**
 * 12. Hook WebSocket Live Feeds
 */
export function useMarketLiveSocket(enabled = true) {
  const { setConnected, addLiveTransaction, addPulse } = useMarketRealtimeStore();

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const socket = getMarketSocket();
    // Socket déjà connecté avant ce composant : état affiché tout de suite
    setConnected(socket.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    // Vente en direct : fil d'actualité seulement (aucun rechargement par vente)
    const handleNewSale = (data: any) => addLiveTransaction(data);

    // Résumé toutes les 3 s : compteurs « En direct » (les chiffres eux-mêmes sont poussés par mi:data)
    const handlePulse = (pulse: MarketPulse) => addPulse(pulse);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('market:new-sale', handleNewSale);
    socket.on('market:pulse', handlePulse);
    return () => {
      socket.off('market:pulse', handlePulse);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('market:new-sale', handleNewSale);
    };
  }, [enabled, setConnected, addLiveTransaction, addPulse]);
}
/**
 * 13. Journal d'audit des accès Market Intelligence
 */
export function useAuditLogsQuery() {
  return useQuery({
    queryKey: marketQueryKeys.auditLogs(),
    queryFn: () => fetchAuditLogs(50),
    staleTime: 30 * 1000,
  });
}

/**
 * 14. État de la synchronisation stock / promotions
 */
export function useSyncStatusQuery() {
  return useQuery({
    queryKey: marketQueryKeys.syncStatus(),
    queryFn: fetchSyncStatus,
    staleTime: 10 * 1000,
    // Rafraîchissement pendant un import initial en cours
    refetchInterval: (query) => (query.state.data?.backfill?.running ? 5000 : false),
  });
}

/**
 * 15. Identité de la session : administrateur E-Maquis ou distributeur abonné (lecture seule)
 */
export function useMarketSessionQuery() {
  const query = useQuery({
    queryKey: [...marketQueryKeys.all, 'session'],
    queryFn: fetchMarketSession,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return { ...query, isPartner: query.data?.kind === 'partner', isAdmin: !!query.data && query.data.kind !== 'partner' };
}
