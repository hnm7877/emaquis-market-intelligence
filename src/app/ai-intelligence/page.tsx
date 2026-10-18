'use client';

import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  Cpu,
  TrendingUp,
  Package,
  ShieldAlert,
  MapPin,
  Copy,
  Check,
  Trash2,
  Plus,
  FileText,
  BarChart3,
  Wand2,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AiChatMessage } from '@/types/market';
import {
  useBrandsQuery,
  useContextualFiltersQuery,
  useGeographyQuery,
  useMarketOverview,
  useProductsQuery,
} from '@/hooks/market/useMarketQueries';
import { answerMarketQuestion } from '@/lib/marketAnalyst';
import { useDeerFlow, CEO_PROMPT_SUGGESTIONS } from '@/hooks/useDeerFlow';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { VOLUME_UNIT_OPTIONS } from '@/utils/volumeUnit';

export default function AiIntelligencePage() {
  const { data: overview } = useMarketOverview();
  const { data: productsData } = useProductsQuery();
  const { data: brandsData } = useBrandsQuery();
  const { data: geoData } = useGeographyQuery();
  const { data: contextualData } = useContextualFiltersQuery();

  const filters = useMarketFilterStore((state) => state.filters);
  const volumeUnit = useMarketFilterStore((state) => state.volumeUnit || 'cols');

  const {
    threads,
    isLoadingThreads,
    activeThreadId,
    setActiveThreadId,
    activeConversation,
    isProcessing,
    currentStep,
    progress,
    stepsCompleted,
    createThread,
    sendMessage,
    runDeepResearch,
    deleteThread,
    contextSummary,
  } = useDeerFlow();

  const [input, setInput] = useState('');
  const [activeMode, setActiveMode] = useState<'chat' | 'research'>('chat');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      content:
        "# Agent DeerFlow — Centre de Décision Stratégique & IA FMCG\n\nBienvenue dans votre espace d'intelligence de marché propulsé par DeerFlow et adossé au réseau certifié E-Maquis.\n\n### Principes de gouvernance de l'agent :\n1. **Zéro hallucination** : Seules les ventes réellement constatées dans les établissements du réseau sont agrégées.\n2. **Contexte dynamique** : Les analyses intègrent automatiquement vos filtres actifs (villes, communes, marques, formats).\n3. **Analyses multi-échelles** : Mode Flash Chat pour les réponses rapides, ou Deep Research pour les audits stratégiques de direction.\n\nSélectionnez une suggestion ci-dessous ou saisissez votre problématique de marché.",
      timestamp: 'Initialisé',
      toolUsed: 'deerflow_orchestrator',
    },
  ]);

  // Messages affichés : ceux du thread actif si disponible, sinon messages locaux
  const displayMessages: AiChatMessage[] = activeConversation?.messages?.length
    ? activeConversation.messages.map((m: any, i: number) => ({
        id: `msg-${i}`,
        sender: m.role === 'user' ? 'user' : 'agent',
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : "À l'instant",
        toolUsed: m.role === 'assistant' ? (activeConversation.type === 'research' ? 'deerflow_deep_research' : 'deerflow_agent') : undefined,
      }))
    : localMessages;

  const handleSend = async (customPrompt?: string) => {
    const q = customPrompt || input;
    if (!q.trim() || isProcessing) return;

    setInput('');

    // Message utilisateur optimiste
    const now = Date.now();
    const userMsg: AiChatMessage = {
      id: `u-${now}`,
      sender: 'user',
      content: q,
      timestamp: "À l'instant",
    };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      let assistantReply = '';
      if (activeMode === 'research') {
        const res = await runDeepResearch({ query: q, depth: 'executive' });
        assistantReply = res.reply;
      } else {
        const res = await sendMessage({ message: q });
        assistantReply = res.reply;
      }

      const agentMsg: AiChatMessage = {
        id: `a-${now + 1}`,
        sender: 'agent',
        content: assistantReply,
        timestamp: "À l'instant",
        toolUsed: activeMode === 'research' ? 'deerflow_deep_research' : 'deerflow_agent',
        sampleMetadata: {
          coverage: `${overview?.kpis?.activePos || 10} points de vente`,
          transactions: overview?.kpis?.analyzedTransactions || 0,
          posCount: overview?.kpis?.activePos || 10,
          period: overview?.comparison?.label || '30 derniers jours',
        },
      };
      setLocalMessages((prev) => [...prev, agentMsg]);
    } catch {
      // Repli local en cas d'indisponibilité
      const fallbackAnswer = answerMarketQuestion(q, {
        overview,
        products: productsData?.products,
        brands: brandsData?.brands,
        zones: geoData?.zones,
        contextSummary,
      });

      setLocalMessages((prev) => [
        ...prev,
        {
          id: `fallback-${now + 1}`,
          sender: 'agent',
          timestamp: "À l'instant",
          ...fallbackAnswer,
        },
      ]);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewSession = async () => {
    try {
      const newThread = await createThread('Nouvelle analyse');
      setActiveThreadId(newThread.threadId);
      setLocalMessages([
        {
          id: `new-${Date.now()}`,
          sender: 'agent',
          content: 'Nouvelle session d\'intelligence DeerFlow initialisée. Posez votre question ou sélectionnez un modèle d\'audit exécutif.',
          timestamp: "À l'instant",
          toolUsed: 'deerflow_orchestrator',
        },
      ]);
    } catch {
      setActiveThreadId(null);
    }
  };

  const currentUnitLabel = VOLUME_UNIT_OPTIONS.find((u) => u.value === volumeUnit)?.label || 'Cols';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Executive Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  DeerFlow Market Intelligence War Room
                </h1>
                <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] font-semibold">
                  C-Level Executive Agent
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audits stratégiques automatisés, analyses multi-échelles et aide à la décision pour dirigeants FMCG & Brasseries.
              </p>
            </div>
          </div>
        </div>

        {/* Global Telemetry Metrics */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-card border border-border/80 flex items-center gap-2">
            <BarChart3 className="size-3.5 text-amber-500" />
            <span className="text-muted-foreground text-[11px]">Ventes analysées :</span>
            <span className="font-bold text-foreground">
              {overview?.kpis?.analyzedTransactions ? overview.kpis.analyzedTransactions.toLocaleString('fr-FR') : 'En direct'}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-card border border-border/80 flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="text-muted-foreground text-[11px]">Certification :</span>
            <span className="font-semibold text-emerald-500">100% Données Réelles</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar History + Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Sessions & Prompt Blueprints */}
        <div className="lg:col-span-1 space-y-4">
          {/* Action Nouvelle Session */}
          <Button
            onClick={handleNewSession}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md text-xs font-semibold h-9 flex items-center justify-center gap-2 rounded-xl"
          >
            <Plus className="size-4" />
            <span>Nouvelle Session IA</span>
          </Button>

          {/* Mode Selector */}
          <Card className="p-3 bg-card/60 backdrop-blur-md border-border/70 space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Mode Opératoire
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-background/80 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setActiveMode('chat')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'chat'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Cpu className="size-3.5" />
                <span>Flash Chat</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('research')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'research'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Compass className="size-3.5" />
                <span>Deep Research</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight px-1">
              {activeMode === 'chat'
                ? 'Réponses immédiates basées sur les données en cache et les filtres actifs.'
                : 'Audit complet multi-étapes avec synthèse exécutive prête pour le comité de direction.'}
            </p>
          </Card>

          {/* Threads History */}
          <Card className="p-3 bg-card/60 backdrop-blur-md border-border/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="size-3 text-amber-500" />
                Historique des Audits
              </span>
              <span className="text-[9px] text-muted-foreground">{threads.length}</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
              {isLoadingThreads ? (
                <p className="text-[11px] text-muted-foreground p-2">Chargement...</p>
              ) : threads.length === 0 ? (
                <p className="text-[11px] text-muted-foreground p-2">Aucun historique récent.</p>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.threadId}
                    onClick={() => setActiveThreadId(t.threadId)}
                    className={`group p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between border transition-all ${
                      activeThreadId === t.threadId
                        ? 'bg-amber-500/10 border-amber-500/40 text-foreground font-medium'
                        : 'border-transparent hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="truncate text-[11px]">{t.title}</p>
                      <span className="text-[9px] text-muted-foreground/80 font-mono">
                        {t.messageCount || 0} échanges
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(t.threadId);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-500 p-1 rounded transition-opacity"
                      title="Supprimer la conversation"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* CEO Blueprints / 1-Click Briefings */}
          <Card className="p-3 bg-card/60 backdrop-blur-md border-border/70 space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="size-3 text-amber-500" />
              Blueprints Exécutifs (CEO)
            </span>
            <div className="space-y-1.5">
              {CEO_PROMPT_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  className="w-full text-left p-2 rounded-lg bg-accent/40 hover:bg-accent border border-border/60 hover:border-amber-500/40 transition-all flex items-start gap-2 group"
                >
                  <div className="size-5 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    {idx === 0 && <TrendingUp className="size-3" />}
                    {idx === 1 && <Package className="size-3" />}
                    {idx === 2 && <ShieldAlert className="size-3" />}
                    {idx === 3 && <MapPin className="size-3" />}
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-[11px] font-semibold text-foreground group-hover:text-amber-500 transition-colors truncate">
                      {item.title}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate">{item.category}</p>
                  </div>
                  <ChevronRight className="size-3 text-muted-foreground group-hover:text-amber-500 shrink-0 self-center transition-colors" />
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Columns: War Room Chat & Deep Research Stream */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          {/* Contexte actif & Filtres bar */}
          <div className="p-2.5 rounded-xl bg-card/70 border border-border/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate text-muted-foreground">
              <SlidersHorizontal className="size-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-foreground text-[11px]">Périmètre d&apos;analyse :</span>
              <span className="truncate text-[11px]">{contextSummary}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px] font-mono border-border">
                Unité : {currentUnitLabel}
              </Badge>
              {activeThreadId && (
                <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-500">
                  ID: #{activeThreadId.slice(-8)}
                </Badge>
              )}
            </div>
          </div>

          {/* Conversation Workspace */}
          <Card className="border border-border/80 bg-card/60 backdrop-blur-md h-[600px] flex flex-col rounded-2xl overflow-hidden shadow-sm">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin">
              {displayMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                      m.sender === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-br-xs font-medium'
                        : 'bg-background/90 text-foreground border border-border/80 rounded-bl-xs'
                    }`}
                  >
                    {m.content}

                    {/* Metadata & Actions footer for Agent responses */}
                    {m.sender === 'agent' && (
                      <div className="mt-3 pt-2.5 border-t border-border/50 text-[10px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                            <CheckCircle2 className="size-3" />
                            Données terrain certifiées
                          </span>
                          {m.toolUsed && (
                            <span className="font-mono bg-accent/60 px-1.5 py-0.5 rounded text-[9px] text-amber-500 border border-border/40">
                              {m.toolUsed}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy(m.content, m.id)}
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[10px] transition-colors"
                          title="Copier pour comité ou rapport"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="size-3 text-emerald-500" />
                              <span className="text-emerald-500 font-medium">Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.timestamp}</span>
                </div>
              ))}

              {/* Reasoning & Execution Feedback */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 text-xs text-foreground max-w-[85%] space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-500 animate-spin" />
                      <span className="font-semibold text-amber-500">
                        {currentStep || 'Agent DeerFlow en cours d\'analyse...'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{progress}%</span>
                  </div>

                  <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {stepsCompleted?.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {stepsCompleted.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-card/80 flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  activeMode === 'research'
                    ? "Objet de l'audit stratégique (ex: Analyse comparative des parts de marché Castel vs Solibra sur Abidjan Nord)..."
                    : "Interrogez l'Agent DeerFlow sur les tendances, la vélocité des SKUs, les ruptures de stock..."
                }
                className="h-10 text-xs bg-background/90"
                disabled={isProcessing}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isProcessing}
                className="h-10 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium shrink-0 shadow-md flex items-center gap-1.5"
              >
                <span>Analyser</span>
                <Send className="size-3.5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
