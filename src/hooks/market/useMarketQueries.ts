'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
  buildQueryParams,
} from '@/api/marketIntelligence.api';
import { firstLiveValue, isLiveConnected, waitForLive, liveFilters, liveKey, subscribeLive, type LiveResource } from '@/api/liveData';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { getMarketSocket } from '@/api/socket';
import { useMarketRealtimeStore as realtimeStore, type MarketPulse } from '@/stores/useMarketRealtimeStore';

/** Direct coupé : rechargement de secours toutes les 60 s ; direct actif : aucune minuterie */
const fallbackInterval = () => (realtimeStore.getState().isConnected ? false : 60 * 1000);

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
  contextualFilters: (status: string, dateRange: string) => [...marketQueryKeys.all, 'contextual-filters', status, dateRange] as const,
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
      queryClient.setQueryData(key, data),
    );
  }, [enabled, resource, subKey, cacheKey, queryClient]);

  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      // Premier chargement : on laisse au direct le temps de se connecter avant de passer en HTTP
      if (isLiveConnected() || (await waitForLive())) {
        const pushed = await firstLiveValue<T>(resource, filters);
        if (pushed !== null) return pushed;
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
export function useMarketOverview() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('overview', buildQueryParams(filters), marketQueryKeys.overview(filters), () => fetchMarketOverview(filters));
}

/** 2. Données géographiques (anonymisées) */
export function useGeographyQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
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

/** 5. Catégories */
export function useCategoriesQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('categories', buildQueryParams(filters), marketQueryKeys.categories(filters), () => fetchCategoriesData(filters));
}

/** 6. Tendances de consommation */
export function useTrendsQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('trends', buildQueryParams(filters), marketQueryKeys.trends(filters), () => fetchTrendsData(filters));
}

/** 7. Stock intelligence */
export function useStockIntelligenceQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('stock', buildQueryParams(filters), marketQueryKeys.stock(filters), () => fetchStockIntelligenceData(filters));
}

/** 8. Impact des promotions */
export function usePromotionsQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useLiveQuery('promotions', buildQueryParams(filters), marketQueryKeys.promotions(filters), () => fetchPromotionsData(filters));
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
export function useContextualFiltersQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  const status = filters.status || 'valid';
  const dateRange = filters.dateRange || 'all';
  const params: Record<string, string> = { status, ...(dateRange !== 'all' ? { dateRange } : {}) };
  return useLiveQuery('contextual', params, marketQueryKeys.contextualFilters(status, dateRange), () =>
    fetchContextualFilters({ status, dateRange }),
  );
}

/**
 * 12. Hook WebSocket Live Feeds
 */
export function useMarketLiveSocket(enabled = true) {
  const { setConnected, addLiveAlert, addLiveTransaction, addPulse } = useMarketRealtimeStore();

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const socket = getMarketSocket();
    // Socket déjà connecté avant ce composant : état affiché tout de suite
    setConnected(socket.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleAlert = (data: any) => addLiveAlert(data);
    // Vente en direct : fil d'actualité seulement (aucun rechargement par vente)
    const handleNewSale = (data: any) => addLiveTransaction(data);

    // Résumé toutes les 3 s : compteurs « En direct » (les chiffres eux-mêmes sont poussés par mi:data)
    const handlePulse = (pulse: MarketPulse) => addPulse(pulse);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('market:alert', handleAlert);
    socket.on('market:new-sale', handleNewSale);
    socket.on('market:pulse', handlePulse);
    return () => {
      socket.off('market:pulse', handlePulse);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('market:alert', handleAlert);
      socket.off('market:new-sale', handleNewSale);
    };
  }, [enabled, setConnected, addLiveAlert, addLiveTransaction, addPulse]);
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
