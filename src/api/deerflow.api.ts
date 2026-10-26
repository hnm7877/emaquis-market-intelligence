import { z } from 'zod';
import { axiosInstance } from './axiosInstance';
import { buildQueryParams } from './marketIntelligence.api';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';

export interface DeerFlowThread {
  _id?: string;
  threadId: string;
  title: string;
  type?: 'chat' | 'research';
  messageCount?: number;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeerFlowMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | Date;
  toolUsed?: string;
  reasoningSteps?: string[];
  sampleMetadata?: {
    coverage: string;
    transactions: number;
    posCount: number;
    period: string;
  };
}

export interface DeerFlowConversation {
  _id?: string;
  userId: string;
  threadId: string;
  title: string;
  type: 'chat' | 'research';
  messages: DeerFlowMessage[];
  messageCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}


/** Réponse de l'agent : texte + faits réels qui lui ont été fournis (contrôlée par Zod) */
const AskResponseSchema = z.object({
  success: z.boolean().default(true),
  threadId: z.string(),
  reply: z.string().min(1),
  facts: z.string().default(''),
  taskId: z.string().nullable().optional(),
});
export type ChatResponse = z.infer<typeof AskResponseSchema>;
export type ResearchResponse = ChatResponse;

export interface DeerFlowStatus {
  threadId: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'unavailable';
  progress?: number;
  currentStep?: string;
  steps?: string[];
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const threadPath = (id: string) => {
  if (!SAFE_ID.test(id)) throw new Error('Conversation invalide');
  return `/market-intelligence/ai/threads/${id}`;
};

/** Filtres actifs du tableau de bord : l'agent répond sur le même périmètre que les pages */
const currentFilters = () => buildQueryParams(useMarketFilterStore.getState().filters);

async function ask(message: string, mode: 'chat' | 'research', threadId?: string): Promise<ChatResponse> {
  const response = await axiosInstance.post('/market-intelligence/ai/ask', {
    message,
    mode,
    threadId: threadId && SAFE_ID.test(threadId) ? threadId : undefined,
    filters: currentFilters(),
  });
  return AskResponseSchema.parse(response.data);
}

/** Message d'erreur lisible (agent indisponible, quota atteint…) */
export function aiErrorMessage(e: unknown): string {
  const status = (e as { response?: { status?: number; data?: { message?: unknown } } })?.response?.status;
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (status === 429) return 'Trop de questions en peu de temps : patientez quelques minutes.';
  if (typeof msg === 'string') return msg;
  return "L'agent IA est indisponible pour le moment.";
}

export const deerflowApi = {
  async listThreads(): Promise<DeerFlowThread[]> {
    const response = await axiosInstance.get('/market-intelligence/ai/threads');
    return Array.isArray(response.data) ? response.data : [];
  },

  async getThread(threadId: string): Promise<DeerFlowConversation> {
    const response = await axiosInstance.get(threadPath(threadId));
    return response.data;
  },

  async deleteThread(threadId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(threadPath(threadId));
    return response.data;
  },

  /** Réponse rapide (le serveur ajoute les chiffres réels du périmètre filtré) */
  chat(message: string, threadId?: string): Promise<ChatResponse> {
    return ask(message, 'chat', threadId);
  },

  /** Analyse approfondie */
  research(query: string, threadId?: string): Promise<ResearchResponse> {
    return ask(query, 'research', threadId);
  },

  async healthCheck(): Promise<{ status: string; error?: string }> {
    const response = await axiosInstance.get('/market-intelligence/ai/health');
    return response.data;
  },
};
