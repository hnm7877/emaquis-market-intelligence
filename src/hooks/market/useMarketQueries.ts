'use client';

import { useQuery } from '@tanstack/react-query';
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
  trends: () => [...marketQueryKeys.all, 'trends'] as const,
  stock: () => [...marketQueryKeys.all, 'stock'] as const,
  promotions: () => [...marketQueryKeys.all, 'promotions'] as const,
  coverage: () => [...marketQueryKeys.all, 'coverage'] as const,
  filtersMetadata: () => [...marketQueryKeys.all, 'filters-metadata'] as const,
};

/**
 * 1. Hook pour la vue d'ensemble (Overview)
 */
export function useMarketOverview() {
  const filters = useMarketFilterStore((state) => state.filters);

  return useQuery({
    queryKey: marketQueryKeys.overview(filters),
    queryFn: () => fetchMarketOverview(filters),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * 2. Hook pour les données géographiques
 */
export function useGeographyQuery() {
  const filters = useMarketFilterStore((state) => state.filters);

  return useQuery({
    queryKey: marketQueryKeys.geography(filters),
    queryFn: () => fetchGeographyData(filters),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 3. Hook pour les données produits avec images Produitglobal
 */
export function useProductsQuery() {
  const filters = useMarketFilterStore((state) => state.filters);

  return useQuery({
    queryKey: marketQueryKeys.products(filters),
    queryFn: () => fetchProductsData(filters),
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * 4. Hook pour les marques
 */
export function useBrandsQuery() {
  const filters = useMarketFilterStore((state) => state.filters);
  return useQuery({
    queryKey: marketQueryKeys.brands(filters),
    queryFn: () => fetchBrandsData(filters),
    staleTime: 5 * 60 * 1000,
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
  return useQuery({
    queryKey: marketQueryKeys.trends(),
    queryFn: fetchTrendsData,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 7. Hook pour le stock intelligence
 */
export function useStockIntelligenceQuery() {
  return useQuery({
    queryKey: marketQueryKeys.stock(),
    queryFn: fetchStockIntelligenceData,
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
 * 11. Hook WebSocket Live Feeds
 */
export function useMarketLiveSocket() {
  const { setConnected, addLiveAlert, addLiveTransaction } = useMarketRealtimeStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const socket = getMarketSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleAlert = (data: any) => addLiveAlert(data);
    const handleNewSale = (data: any) => addLiveTransaction(data);

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
  }, [setConnected, addLiveAlert, addLiveTransaction]);
}