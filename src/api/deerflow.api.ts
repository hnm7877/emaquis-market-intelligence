import { axiosInstance } from './axiosInstance';

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

export interface ChatResponse {
  success: boolean;
  threadId: string;
  reply: string;
}

export interface ResearchResponse {
  success: boolean;
  threadId: string;
  reply: string;
  taskId?: string | null;
}

export interface DeerFlowStatus {
  threadId: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress?: number;
  currentStep?: string;
  steps?: string[];
}

export const deerflowApi = {
  /**
   * Créer un nouveau thread de conversation
   */
  async createThread(title?: string): Promise<{ success: boolean; threadId: string; title: string }> {
    const response = await axiosInstance.post('/ai/deerflow/threads', { title });
    return response.data;
  },

  /**
   * Lister tous les threads de l'utilisateur
   */
  async listThreads(): Promise<DeerFlowThread[]> {
    const response = await axiosInstance.get('/ai/deerflow/threads');
    return response.data;
  },

  /**
   * Récupérer un thread avec son historique de messages
   */
  async getThread(threadId: string): Promise<DeerFlowConversation> {
    const response = await axiosInstance.get(`/ai/deerflow/threads/${threadId}`);
    return response.data;
  },

  /**
   * Archiver/supprimer un thread
   */
  async deleteThread(threadId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete(`/ai/deerflow/threads/${threadId}`);
    return response.data;
  },

  /**
   * Envoyer un message dans le thread (mode discussion rapide)
   */
  async chat(message: string, threadId?: string, context?: string): Promise<ChatResponse> {
    const response = await axiosInstance.post('/ai/deerflow/chat', {
      message,
      threadId,
      context,
    });
    return response.data;
  },

  /**
   * Lancer une analyse ou recherche approfondie (mode Deep Research)
   */
  async research(
    query: string,
    threadId?: string,
    depth: 'standard' | 'deep' | 'executive' = 'executive'
  ): Promise<ResearchResponse> {
    const response = await axiosInstance.post('/ai/deerflow/research', {
      query,
      threadId,
      depth,
    });
    return response.data;
  },

  /**
   * Récupérer le statut d'avancement d'un thread
   */
  async getStatus(threadId: string): Promise<DeerFlowStatus> {
    const response = await axiosInstance.get(`/ai/deerflow/status/${threadId}`);
    return response.data;
  },

  /**
   * Vérifier l'état de la Gateway DeerFlow
   */
  async healthCheck(): Promise<{ status: string; gateway?: any; error?: string }> {
    const response = await axiosInstance.get('/ai/deerflow/health');
    return response.data;
  },
};
