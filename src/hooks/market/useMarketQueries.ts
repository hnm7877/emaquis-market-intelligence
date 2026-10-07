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
} from '@/api/marketIntelligence.api';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { getMarketSocket } from '@/api/socket';

export const marketQueryKeys = {
  all: ['market'] as const,
  overview: (filters: any) => [...marketQueryKeys.all, 'overview', filters] as const,
  geography: (filters: any) => [...marketQueryKeys.all, 'geography', filters] as const,
  products: (filters: any) => [...marketQueryKeys.all, 'products', filters] as const,
  brands: (filters?: any) => [...marketQueryKeys.all, 'brands', filters] as const,
  categories: (filters?: any) => [...marketQueryKeys.all, 'categories', filters] as const,
  trends: (filters?: unknown) => [...marketQueryKeys.all, 'trends', filters] as const,
  stock: (filters?: unknown) => [...marketQueryKeys.all, 'stock', filters] as const,
  promotions: () => [...marketQueryKeys.all, 'promotions'] as const,
  coverage: () => [...marketQueryKeys.all, 'coverage'] as const,
  filtersMetadata: () => [...marketQueryKeys.all, 'filters-metadata'] as const,
  contextualFilters: (status: string, dateRange: string) => [...marketQueryKeys.all, 'contextual-filters', status, dateRange] as const,
};

/**
 * 1. Hook pour la vue d'ensemble (Overview)
 */
export function useMarketOverview() {
  const filters = useMarketFilterStore((state) => state.filters);

  return useQuery({
    queryKey: marketQueryKeys.overview(filters),
    queryFn: () => fetchMarketOverview(filters),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * 2. Hook pour les données géographiques
 */
export function useGeographyQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);

  return useQuery({
    queryKey: marketQueryKeys.geography(filters),
    queryFn: () => fetchGeographyData(filters),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * 3. Hook pour les données produits avec images Produitglobal
 */
export function useProductsQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);

  return useQuery({
    queryKey: marketQueryKeys.products(filters),
    queryFn: () => fetchProductsData(filters),
    staleTime: 3 * 60 * 1000,
    enabled,
  });
}

/**
 * 4. Hook pour les marques
 */
export function useBrandsQuery(enabled = true) {
  const filters = useMarketFilterStore((state) => state.filters);
  return useQuery({
    queryKey: marketQueryKeys.brands(filters),
    queryFn: () => fetchBrandsData(filters),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/**
 * 5. Hook pour les catégories
 */
export function useCategoriesQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useQuery({
    queryKey: marketQueryKeys.categories(filters),
    queryFn: () => fetchCategoriesData(filters),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 6. Hook pour les tendances de consommation
 */
export function useTrendsQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useQuery({
    queryKey: marketQueryKeys.trends(filters),
    queryFn: () => fetchTrendsData(filters),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 7. Hook pour le stock intelligence
 */
export function useStockIntelligenceQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useQuery({
    queryKey: marketQueryKeys.stock(filters),
    queryFn: () => fetchStockIntelligenceData(filters),
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * 8. Hook pour l'impact des promotions
 */
export function usePromotionsQuery() {
  return useQuery({
    queryKey: marketQueryKeys.promotions(),
    queryFn: fetchPromotionsData,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * 9. Hook pour la couverture réseau
 */
export function useDataCoverageQuery() {
  return useQuery({
    queryKey: marketQueryKeys.coverage(),
    queryFn: fetchDataCoverage,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * 10. Hook pour les filtres dynamiques (villes, communes, catégories, marques)
 */
export function useMarketFiltersQuery() {
  return useQuery({
    queryKey: marketQueryKeys.filtersMetadata(),
    queryFn: fetchFiltersMetadata,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * 11. Hook pour les filtres contextuels (suggestions dynamiques selon statut/periode)
 */
export function useContextualFiltersQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  const status = filters.status || 'valid';
  const dateRange = filters.dateRange || 'all';

  return useQuery({
    queryKey: marketQueryKeys.contextualFilters(status, dateRange),
    queryFn: () => fetchContextualFilters({ status, dateRange }),
    staleTime: 10 * 1000,
    refetchInterval: 20 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * 12. Hook WebSocket Live Feeds
 */
export function useMarketLiveSocket() {
  const { setConnected, addLiveAlert, addLiveTransaction } = useMarketRealtimeStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const socket = getMarketSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleAlert = (data: any) => addLiveAlert(data);
    const handleNewSale = (data: any) => {
      console.log('⚡ [MARKET LIVE] Vente reçue en direct:', data);
      addLiveTransaction(data);
      // Invalider immédiatement les caches React Query pour recalculer les statistiques
      queryClient.invalidateQueries({ queryKey: marketQueryKeys.all });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('market:alert', handleAlert);
    socket.on('market:new-sale', handleNewSale);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('market:alert', handleAlert);
      socket.off('market:new-sale', handleNewSale);
    };
  }, [setConnected, addLiveAlert, addLiveTransaction, queryClient]);
}