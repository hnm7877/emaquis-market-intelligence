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
} from '@/api/marketIntelligence.api';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { getMarketSocket } from '@/api/socket';
import { useMarketRealtimeStore as realtimeStore, type MarketPulse } from '@/stores/useMarketRealtimeStore';

/** Rechargement des chiffres au plus une fois par minute (rythme du cache serveur) */
const LIVE_REFRESH_MS = 60 * 1000;
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
 * 1. Hook pour la vue d'ensemble (Overview)
 */
export function useMarketOverview() {
  const filters = useMarketFilterStore((state) => state.filters);

  return useQuery({
    queryKey: marketQueryKeys.overview(filters),
    queryFn: () => fetchMarketOverview(filters),
    staleTime: 10 * 1000,
    // Le direct (market:pulse) déclenche les rafraîchissements ; minuterie seulement en secours
    refetchInterval: fallbackInterval,
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
  const filters = useMarketFilterStore((state) => state.filters);
  return useQuery({
    queryKey: marketQueryKeys.promotions(filters),
    queryFn: () => fetchPromotionsData(filters),
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
    refetchInterval: fallbackInterval,
    refetchOnWindowFocus: true,
  });
}

/**
 * 12. Hook WebSocket Live Feeds
 */
export function useMarketLiveSocket(enabled = true) {
  const { setConnected, addLiveAlert, addLiveTransaction, addPulse } = useMarketRealtimeStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const socket = getMarketSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleAlert = (data: any) => addLiveAlert(data);
    // Vente en direct : fil d'actualité seulement (aucun rechargement par vente)
    const handleNewSale = (data: any) => addLiveTransaction(data);

    // Résumé toutes les 3 s : compteurs en direct, puis rechargement des chiffres au plus une
    // fois par minute (rythme du cache serveur), pour ne jamais submerger l'API
    let lastRefresh = Date.now();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const handlePulse = (pulse: MarketPulse) => {
      addPulse(pulse);
      if (refreshTimer) return;
      const wait = Math.max(0, LIVE_REFRESH_MS - (Date.now() - lastRefresh));
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        lastRefresh = Date.now();
        queryClient.invalidateQueries({ queryKey: marketQueryKeys.all });
      }, wait);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('market:alert', handleAlert);
    socket.on('market:new-sale', handleNewSale);
    socket.on('market:pulse', handlePulse);
    // Position/adresse d'un établissement mise à jour (barman sur place, réglages, inscription) :
    // recharge les vues géographiques, regroupé pour éviter les rafales.
    let geoTimer: ReturnType<typeof setTimeout> | null = null;
    const handleGeoUpdated = () => {
      if (geoTimer) clearTimeout(geoTimer);
      geoTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: marketQueryKeys.all });
      }, 1500);
    };
    socket.on('market:geo-updated', handleGeoUpdated);

    return () => {
      if (geoTimer) clearTimeout(geoTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.off('market:pulse', handlePulse);
      socket.off('market:geo-updated', handleGeoUpdated);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('market:alert', handleAlert);
      socket.off('market:new-sale', handleNewSale);
    };
  }, [enabled, setConnected, addLiveAlert, addLiveTransaction, addPulse, queryClient]);
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
