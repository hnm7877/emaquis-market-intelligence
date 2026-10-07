'use client';

import React, { useState, useMemo } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpRight,
  MessageSquarePlus,
  Flame,
  Gauge,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AiChatMessage } from '@/types/market';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import {
  useBrandsQuery,
  useContextualFiltersQuery,
  useGeographyQuery,
  useMarketOverview,
  useProductsQuery,
} from '@/hooks/market/useMarketQueries';
import { answerMarketQuestion, SUGGESTED_QUESTIONS } from '@/lib/marketAnalyst';
import { VOLUME_UNIT_OPTIONS } from '@/utils/volumeUnit';

interface AiChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  valid: 'Validées & Consommées',
  all: 'Tous les statuts',
  success: 'Réglées avec succès',
  pending: 'En attente / Tables actives',
  return: 'Retours & Consignes',
  canceled: 'Commandes annulées',
  offered: 'Offertes par le maquis',
};

const WELCOME_MESSAGE: AiChatMessage = {
  id: 'msg-1',
  sender: 'agent',
  content:
    "Bonjour ! Je réponds à partir des ventes réellement observées dans le réseau E-Maquis, selon vos filtres actifs. Je n'invente aucun chiffre : si les données sont insuffisantes, je vous le dis.\n\nQuelle analyse souhaitez-vous mener ?",
  timestamp: "À l'instant",
};

export function AiChatDrawer({ open, onClose }: AiChatDrawerProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filters = useMarketFilterStore((state) => state.filters);
  const volumeUnit = useMarketFilterStore((state) => state.volumeUnit || 'cols');
  const { data: contextualData } = useContextualFiltersQuery();
  const { data: overviewData } = useMarketOverview();
  // Données détaillées chargées seulement quand le tiroir est ouvert
  const { data: productsData } = useProductsQuery(open);
  const { data: brandsData } = useBrandsQuery(open);
  const { data: geoData } = useGeographyQuery(open);

  // Résumé textuel lisible du contexte actif avec unité de volume
  const contextSummary = useMemo(() => {
    const parts: string[] = [];
    const statusName = STATUS_LABELS[filters.status || 'valid'] || 'Validées';
    parts.push(`Statut: ${statusName}`);

    const unitObj = VOLUME_UNIT_OPTIONS.find((u) => u.value === volumeUnit);
    if (unitObj) {
      parts.push(`Unité: ${unitObj.label}`);
    }

    if (filters.city && filters.city !== 'Toutes les villes' && filters.city !== 'all') {
      const citiesStr = Array.isArray(filters.city) ? filters.city.join(', ') : filters.city;
      parts.push(`Villes: ${citiesStr}`);
    }

    if (filters.commune && filters.commune !== 'Toutes les communes' && filters.commune !== 'all') {
      const commStr = Array.isArray(filters.commune) ? filters.commune.join(', ') : filters.commune;
      parts.push(`Communes: ${commStr}`);
    }

    if (filters.brand && filters.brand !== 'Toutes marques' && filters.brand !== 'all') {
      const brandsStr = Array.isArray(filters.brand) ? filters.brand.join(', ') : filters.brand;
      parts.push(`Marques: ${brandsStr}`);
    }

    if (filters.category && filters.category !== 'Toutes catégories' && filters.category !== 'all') {
      const catStr = Array.isArray(filters.category) ? filters.category.join(', ') : filters.category;
      parts.push(`Catégorie: ${catStr}`);
    }

    return parts.join(' • ');
  }, [filters, volumeUnit]);

  if (!open) return null;

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim()) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: q,
      timestamp: "À l'instant",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Réponse construite uniquement à partir des données API déjà chargées
    const answer = answerMarketQuestion(q, {
      overview: overviewData,
      products: productsData?.products,
      brands: brandsData?.brands,
      zones: geoData?.zones,
      contextSummary,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        timestamp: "À l'instant",
        ...answer,
      },
    ]);
    setIsLoading(false);
  };

  // Optimiser le prompt saisi par l'utilisateur avec le contexte actif, les unités et l'intelligence produits
  const handleOptimizePrompt = () => {
    const currentUnitLabel = VOLUME_UNIT_OPTIONS.find((u) => u.value === volumeUnit)?.shortLabel || 'Cols';
    if (!input.trim()) {
      setInput(`Analyse détaillée des ventes de produits en ${currentUnitLabel}, vélocité des SKUs, risques de rupture et hotspots pour ${contextSummary}`);
    } else {
      setInput(`[Analyse Produits & ${currentUnitLabel}] ${input.trim()} (Contexte: ${contextSummary})`);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-card/95 backdrop-blur-2xl border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/60">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
            <Bot className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-foreground">Agent IA Market Intelligence</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-500 font-medium">
                Contexte dynamique
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Réponses calculées sur les données API, selon vos filtres
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="size-8 rounded-lg">
          <X className="size-4" />
        </Button>
      </div>

      {/* Barre de contexte actif */}
      <div className="px-4 py-2 bg-muted/40 border-b border-border/50 flex items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5 truncate text-muted-foreground">
          <SlidersHorizontal className="size-3 text-amber-500 shrink-0" />
          <span className="truncate">{contextSummary}</span>
        </div>
        <button
          type="button"
          onClick={handleOptimizePrompt}
          className="shrink-0 flex items-center gap-1 text-amber-500 hover:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded transition-colors"
          title="Optimiser et injecter le contexte actif dans votre prompt"
        >
          <Wand2 className="size-2.5" />
          <span>Optimiser prompt</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs scrollbar-thin">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line ${
                m.sender === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-xs font-medium shadow-xs'
                  : 'bg-accent/60 text-foreground border border-border/70 rounded-bl-xs shadow-xs'
              }`}
            >
              {m.content}

              {m.sampleMetadata && (
                <div className="mt-2.5 pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                    <CheckCircle2 className="size-3" />
                    {m.sampleMetadata.coverage}
                  </span>
                  {m.toolUsed && (
                    <span className="font-mono bg-background/60 px-1 py-0.5 rounded border border-border/40 text-[9px]">
                      tool: {m.toolUsed}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-[9px] text-muted-foreground mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/40 border border-border/60 text-xs text-muted-foreground max-w-[85%] animate-pulse">
            <Sparkles className="size-3.5 text-amber-500 animate-spin" />
            <span>Consultation en direct des données réseau E-Maquis...</span>
          </div>
        )}
      </div>

      {/* Suggested Contextual Prompts */}
      <div className="px-4 py-2.5 border-t border-border/50 bg-card/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MessageSquarePlus className="size-3 text-amber-500" />
            Questions adaptées à vos filtres :
          </span>
          <span className="text-[9px] text-amber-500/80 font-mono">
            {contextualData?.totalTransactions != null
              ? `${contextualData.totalTransactions.toLocaleString('fr-FR')} ventes`
              : ''}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-accent/50 hover:bg-accent border border-border/60 text-foreground transition-all flex items-center justify-between gap-2 group hover:border-amber-500/40"
            >
              <span className="truncate">{q}</span>
              <ArrowUpRight className="size-3 text-muted-foreground group-hover:text-amber-500 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 border-t border-border bg-card/60 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Posez votre question (ex: Hotspots thermiques, conversions hL, ruptures...)"
          className="h-9 text-xs bg-background/80"
        />
        <Button
          size="icon"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="size-9 bg-primary text-primary-foreground shrink-0 shadow-sm"
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
