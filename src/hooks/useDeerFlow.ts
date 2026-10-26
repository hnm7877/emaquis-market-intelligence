'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { deerflowApi } from '@/api/deerflow.api';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { VOLUME_UNIT_OPTIONS } from '@/utils/volumeUnit';

export const deerflowQueryKeys = {
  all: ['deerflow'] as const,
  threads: () => [...deerflowQueryKeys.all, 'threads'] as const,
  thread: (id: string) => [...deerflowQueryKeys.all, 'thread', id] as const,
  health: () => [...deerflowQueryKeys.all, 'health'] as const,
};

/** Questions proposées (l'agent répond à partir des chiffres réels du périmètre filtré) */
export const CEO_PROMPT_SUGGESTIONS = [
  { category: 'Synthèse', title: 'Briefing de la période', prompt: 'Fais-moi un briefing de la période : volumes, chiffre d’affaires, évolution et marques qui tirent le marché.', icon: 'TrendingUp', depth: 'executive' as const },
  { category: 'Stock', title: 'Ruptures et ventes manquées', prompt: 'Où sont les ruptures les plus coûteuses et combien de ventes perdons-nous par jour ? Que faire en priorité ?', icon: 'Package', depth: 'standard' as const },
  { category: 'Concurrence', title: 'Marques qui gagnent ou perdent', prompt: 'Quelles marques gagnent ou perdent du terrain, et dans quelles proportions ?', icon: 'ShieldAlert', depth: 'standard' as const },
  { category: 'Promotions', title: 'Quelle promo lancer ?', prompt: 'D’après les promotions passées, quelle remise et quel moment donnent le meilleur résultat ?', icon: 'MapPin', depth: 'standard' as const },
];

/**
 * Agent IA : conversations du compte connecté, questions envoyées avec les filtres actifs.
 * Le serveur ajoute lui-même les chiffres réels ; aucune réponse n'est inventée en cas de panne.
 */
export function useDeerFlow() {
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const filters = useMarketFilterStore((state) => state.filters);
  const volumeUnit = useMarketFilterStore((state) => state.volumeUnit || 'cols');

  const buildContextString = useCallback(() => {
    const parts: string[] = [];
    const unitObj = VOLUME_UNIT_OPTIONS.find((u) => u.value === volumeUnit);
    if (unitObj) parts.push(`Unité de volume: ${unitObj.label}`);
    if (filters.dateRange) parts.push(`Période: ${filters.dateRange}`);
    const list = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v));
    if (filters.city && filters.city !== 'all') parts.push(`Villes: ${list(filters.city)}`);
    if (filters.commune && filters.commune !== 'all') parts.push(`Communes: ${list(filters.commune)}`);
    if (filters.category && filters.category !== 'all') parts.push(`Catégories: ${list(filters.category)}`);
    if (filters.brand && filters.brand !== 'all') parts.push(`Marques: ${list(filters.brand)}`);
    if (filters.posType && filters.posType !== 'all') parts.push(`Type POS: ${filters.posType}`);
    return parts.length > 0 ? parts.join(' | ') : 'Tout le réseau';
  }, [filters, volumeUnit]);

  const threadsQuery = useQuery({ queryKey: deerflowQueryKeys.threads(), queryFn: () => deerflowApi.listThreads(), staleTime: 30_000, retry: 1 });
  const activeThreadQuery = useQuery({
    queryKey: deerflowQueryKeys.thread(activeThreadId || ''),
    queryFn: () => deerflowApi.getThread(activeThreadId!),
    enabled: Boolean(activeThreadId),
    staleTime: 10_000,
  });
  const healthQuery = useQuery({ queryKey: deerflowQueryKeys.health(), queryFn: () => deerflowApi.healthCheck(), staleTime: 60_000, refetchInterval: 120_000, retry: 0 });

  const settle = (threadId?: string) => {
    setCurrentStep(null);
    if (threadId) {
      setActiveThreadId(threadId);
      void queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.thread(threadId) });
      void queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.threads() });
    }
  };

  const chatMutation = useMutation({
    mutationFn: ({ message, threadId }: { message: string; threadId?: string }) => {
      setCurrentStep('Lecture des chiffres du périmètre puis rédaction…');
      return deerflowApi.chat(message, threadId || activeThreadId || undefined);
    },
    onSuccess: (data) => settle(data.threadId),
    onError: () => setCurrentStep(null),
  });

  const researchMutation = useMutation({
    mutationFn: ({ query, threadId }: { query: string; threadId?: string; depth?: string }) => {
      setCurrentStep('Analyse approfondie des chiffres du périmètre…');
      return deerflowApi.research(query, threadId || activeThreadId || undefined);
    },
    onSuccess: (data) => settle(data.threadId),
    onError: () => setCurrentStep(null),
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => deerflowApi.deleteThread(threadId),
    onSuccess: (_, threadId) => {
      if (activeThreadId === threadId) setActiveThreadId(null);
      void queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.threads() });
    },
  });

  const isProcessing = chatMutation.isPending || researchMutation.isPending;
  const health = healthQuery.data?.status;

  return {
    threads: threadsQuery.data || [],
    isLoadingThreads: threadsQuery.isLoading,
    activeThreadId,
    setActiveThreadId,
    activeConversation: activeThreadQuery.data,
    isLoadingActiveThread: activeThreadQuery.isLoading,
    isProcessing,
    currentStep,
    /** true / false / null (inconnu) */
    aiOnline: healthQuery.isError ? false : health ? health === 'online' : null,
    /** Nouvelle conversation : la prochaine question en crée une côté serveur */
    newConversation: () => setActiveThreadId(null),
    sendMessage: chatMutation.mutateAsync,
    runDeepResearch: researchMutation.mutateAsync,
    deleteThread: deleteThreadMutation.mutateAsync,
    contextSummary: buildContextString(),
    refetchThreads: threadsQuery.refetch,
  };
}
