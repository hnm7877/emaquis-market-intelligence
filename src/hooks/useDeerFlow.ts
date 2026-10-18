'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  deerflowApi,
  DeerFlowThread,
  DeerFlowMessage,
  DeerFlowStatus,
} from '@/api/deerflow.api';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { VOLUME_UNIT_OPTIONS } from '@/utils/volumeUnit';

export const deerflowQueryKeys = {
  all: ['deerflow'] as const,
  threads: () => [...deerflowQueryKeys.all, 'threads'] as const,
  thread: (id: string) => [...deerflowQueryKeys.all, 'thread', id] as const,
  status: (id: string) => [...deerflowQueryKeys.all, 'status', id] as const,
  health: () => [...deerflowQueryKeys.all, 'health'] as const,
};

/**
 * Suggestions stratégiques orientées CEO & Dirigeants FMCG / Brasseries
 */
export const CEO_PROMPT_SUGGESTIONS = [
  {
    category: 'Flash Audit Exécutif',
    title: 'Vue d\'ensemble & Ratios de croissance',
    prompt: 'Prépare-moi un briefing exécutif sur les volumes globaux, les catégories motrices et les signaux faibles observés sur la période filtrée.',
    icon: 'TrendingUp',
    depth: 'executive' as const,
  },
  {
    category: 'Vélocité & SKUs',
    title: 'Top 5 Produits & Risques de Rupture',
    prompt: 'Quelles sont les 5 références à plus forte rotation et quels points de vente risquent une rupture de stock ce weekend ?',
    icon: 'Package',
    depth: 'standard' as const,
  },
  {
    category: 'Part de Marché',
    title: 'Pression Concurrentielle & Marques',
    prompt: 'Compare la performance des marques phares dans les principales communes. Qui gagne ou perd des parts de volume observées ?',
    icon: 'ShieldAlert',
    depth: 'deep' as const,
  },
  {
    category: 'Géo-Intelligence',
    title: 'Audit des Zones & Hotspots',
    prompt: 'Identifie les communes avec la plus forte progression de consommation et celles où les ventes ralentissent.',
    icon: 'MapPin',
    depth: 'standard' as const,
  },
];

export function useDeerFlow() {
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  const filters = useMarketFilterStore((state) => state.filters);
  const volumeUnit = useMarketFilterStore((state) => state.volumeUnit || 'cols');

  // Génération automatique du résumé contextuel à injecter aux prompts
  const buildContextString = useCallback(() => {
    const parts: string[] = [];
    const unitObj = VOLUME_UNIT_OPTIONS.find((u) => u.value === volumeUnit);
    if (unitObj) parts.push(`Unité de volume: ${unitObj.label}`);

    if (filters.dateRange) parts.push(`Période: ${filters.dateRange}`);
    if (filters.city && filters.city !== 'all') parts.push(`Villes: ${Array.isArray(filters.city) ? filters.city.join(', ') : filters.city}`);
    if (filters.commune && filters.commune !== 'all') parts.push(`Communes: ${Array.isArray(filters.commune) ? filters.commune.join(', ') : filters.commune}`);
    if (filters.category && filters.category !== 'all') parts.push(`Catégories: ${Array.isArray(filters.category) ? filters.category.join(', ') : filters.category}`);
    if (filters.brand && filters.brand !== 'all') parts.push(`Marques: ${Array.isArray(filters.brand) ? filters.brand.join(', ') : filters.brand}`);
    if (filters.posType && filters.posType !== 'all') parts.push(`Type POS: ${filters.posType}`);

    return parts.length > 0 ? parts.join(' | ') : 'Tous filtres globaux réseau';
  }, [filters, volumeUnit]);

  // Requête des threads existants
  const threadsQuery = useQuery({
    queryKey: deerflowQueryKeys.threads(),
    queryFn: () => deerflowApi.listThreads(),
    staleTime: 30 * 1000,
    retry: 1,
  });

  // Requête du thread actif
  const activeThreadQuery = useQuery({
    queryKey: deerflowQueryKeys.thread(activeThreadId || ''),
    queryFn: () => deerflowApi.getThread(activeThreadId!),
    enabled: Boolean(activeThreadId),
    staleTime: 10 * 1000,
  });

  // Statut d'avancement du thread actif (polling quand une tâche tourne)
  const statusQuery = useQuery({
    queryKey: deerflowQueryKeys.status(activeThreadId || ''),
    queryFn: () => deerflowApi.getStatus(activeThreadId!),
    enabled: Boolean(activeThreadId) && isProcessing,
    refetchInterval: isProcessing ? 2000 : false,
  });

  // Mutation création de thread
  const createThreadMutation = useMutation({
    mutationFn: (title?: string) => deerflowApi.createThread(title),
    onSuccess: (data) => {
      setActiveThreadId(data.threadId);
      queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.threads() });
    },
  });

  // Mutation envoi de message Chat
  const chatMutation = useMutation({
    mutationFn: async ({ message, threadId }: { message: string; threadId?: string }) => {
      setIsProcessing(true);
      setCurrentStep('Analyse des ventes réseau en cours...');
      const targetThreadId = threadId || activeThreadId || undefined;
      const context = buildContextString();
      return deerflowApi.chat(message, targetThreadId, context);
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setCurrentStep(null);
      if (data.threadId) {
        setActiveThreadId(data.threadId);
        queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.thread(data.threadId) });
        queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.threads() });
      }
    },
    onError: () => {
      setIsProcessing(false);
      setCurrentStep(null);
    },
  });

  // Mutation Deep Research
  const researchMutation = useMutation({
    mutationFn: async ({
      query,
      threadId,
      depth = 'executive',
    }: {
      query: string;
      threadId?: string;
      depth?: 'standard' | 'deep' | 'executive';
    }) => {
      setIsProcessing(true);
      setCurrentStep('Audit stratégique Deep Research en cours...');
      const targetThreadId = threadId || activeThreadId || undefined;
      return deerflowApi.research(query, targetThreadId, depth);
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setCurrentStep(null);
      if (data.threadId) {
        setActiveThreadId(data.threadId);
        queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.thread(data.threadId) });
        queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.threads() });
      }
    },
    onError: () => {
      setIsProcessing(false);
      setCurrentStep(null);
    },
  });

  // Mutation suppression de thread
  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => deerflowApi.deleteThread(threadId),
    onSuccess: (_, threadId) => {
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
      queryClient.invalidateQueries({ queryKey: deerflowQueryKeys.threads() });
    },
  });

  return {
    threads: threadsQuery.data || [],
    isLoadingThreads: threadsQuery.isLoading,
    activeThreadId,
    setActiveThreadId,
    activeConversation: activeThreadQuery.data,
    isLoadingActiveThread: activeThreadQuery.isLoading,
    isProcessing,
    currentStep: currentStep || statusQuery.data?.currentStep,
    progress: statusQuery.data?.progress || (isProcessing ? 65 : 0),
    stepsCompleted: statusQuery.data?.steps || [],
    createThread: createThreadMutation.mutateAsync,
    sendMessage: chatMutation.mutateAsync,
    runDeepResearch: researchMutation.mutateAsync,
    deleteThread: deleteThreadMutation.mutateAsync,
    contextSummary: buildContextString(),
    refetchThreads: threadsQuery.refetch,
  };
}
