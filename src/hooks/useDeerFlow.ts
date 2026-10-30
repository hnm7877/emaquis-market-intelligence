'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { deerflowApi } from '@/api/deerflow.api';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { VOLUME_UNIT_OPTIONS } from '@/utils/volumeUnit';
import { PAYS } from '@/constants/countries';

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
  { category: 'Pays', title: 'Comparer les pays', prompt: 'Compare les pays du réseau : ventes, chiffre d’affaires et part de chacun. Où le marché est-il le plus dynamique ?', icon: 'Globe', depth: 'standard' as const },
  { category: 'Produits', title: 'Produits qui montent ou baissent', prompt: 'Quels produits montent et lesquels baissent le plus ? Que faut-il mettre en avant ou surveiller ?', icon: 'TrendingUp', depth: 'standard' as const },
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
    // Seuls les filtres réellement actifs, avec des libellés lisibles
    const values = (v: unknown): string[] =>
      (Array.isArray(v) ? v : v ? [v] : [])
        .map((x) => String(x).trim())
        .filter((x) => x && x !== 'all' && !x.toLowerCase().startsWith('tou'));
    const countryName = (code: string) => PAYS.find((p) => p.code === code)?.name.replace(/_/g, ' ') ?? code.replace(/_/g, ' ');
    const parts: string[] = [];
    const period = values(filters.dateRange);
    parts.push(`Période : ${period.length ? period.join(', ') : 'toutes les dates'}`);
    const add = (label: string, v: unknown, map: (x: string) => string = (x) => x) => {
      const list = values(v);
      if (list.length) parts.push(`${label} : ${list.map(map).join(', ')}`);
    };
    add('Pays', filters.country, countryName);
    add('Villes', filters.city);
    add('Communes', filters.commune);
    add('Catégories', filters.category);
    add('Marques', filters.brand);
    add('Type', filters.posType);
    const unitObj = VOLUME_UNIT_OPTIONS.find((u) => u.value === volumeUnit);
    if (unitObj) parts.push(`Unité : ${unitObj.label}`);
    return parts.join(' · ');
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
