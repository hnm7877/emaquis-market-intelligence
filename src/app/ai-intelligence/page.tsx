'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Check,
  ChevronDown,
  Compass,
  Copy,
  Cpu,
  Database,
  Download,
  FileSearch,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/layout/FilterBar';
import { MarkdownLite } from '@/components/ai/MarkdownLite';
import { useDeerFlow, CEO_PROMPT_SUGGESTIONS } from '@/hooks/useDeerFlow';
import { useBrandsQuery, useGeographyQuery, useMarketOverview, useMarketSessionQuery, useProductsQuery } from '@/hooks/market/useMarketQueries';
import { aiErrorMessage } from '@/api/deerflow.api';
import { answerMarketQuestion } from '@/lib/marketAnalyst';
import { downloadBlob, fileSlug } from '@/lib/reports/exportExcel';
import { useAiUiStore } from '@/stores/useAiUiStore';

const EASE = [0.23, 1, 0.32, 1] as const;

type Msg = {
  id: string;
  role: 'user' | 'agent' | 'local' | 'error';
  content: string;
  at: string;
  facts?: string;
};

const time = (d?: string | Date) => new Date(d ?? Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function Bubble({ m, onCopy, copied }: { m: Msg; onCopy: (m: Msg) => void; copied: boolean }) {
  const [showFacts, setShowFacts] = useState(false);
  const user = m.role === 'user';
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className={`flex gap-3 ${user ? 'flex-row-reverse' : ''}`}>
      <div className={`size-8 shrink-0 rounded-lg flex items-center justify-center ${user ? 'bg-accent' : m.role === 'error' ? 'bg-rose-500/15' : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'}`}>
        {user ? <User className="size-4" /> : m.role === 'error' ? <TriangleAlert className="size-4 text-rose-400" /> : m.role === 'local' ? <Database className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-foreground ${user ? 'bg-primary/15 rounded-tr-sm' : m.role === 'error' ? 'bg-rose-500/10 border border-rose-500/30 rounded-tl-sm' : 'bg-card border border-border/70 rounded-tl-sm'}`}>
        {m.role === 'local' && <Badge variant="outline" className="mb-2 text-[10px] border-sky-500/40 text-sky-400">Réponse calculée sans IA, à partir des chiffres affichés</Badge>}
        {user || m.role === 'error' ? <p className="text-[13px] whitespace-pre-line">{m.content}</p> : <MarkdownLite text={m.content} />}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span>{m.at}</span>
          {!user && m.role !== 'error' && (
            <button onClick={() => onCopy(m)} className="flex items-center gap-1 hover:text-foreground">
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />} {copied ? 'Copié' : 'Copier'}
            </button>
          )}
          {m.facts && (
            <button onClick={() => setShowFacts((v) => !v)} className="flex items-center gap-1 hover:text-foreground">
              <FileSearch className="size-3" /> Chiffres utilisés <ChevronDown className={`size-3 transition-transform ${showFacts ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {showFacts && m.facts && (
            <motion.pre initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}
              className="mt-2 overflow-hidden rounded-lg bg-background/70 border border-border/60 p-3 text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {m.facts}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function AiIntelligencePage() {
  const { mode, set } = useAiUiStore();
  const { data: session, isPartner } = useMarketSessionQuery();
  const { data: overview } = useMarketOverview();
  const { data: productsData } = useProductsQuery();
  const { data: brandsData } = useBrandsQuery();
  const { data: geoData } = useGeographyQuery();
  const ai = useDeerFlow();
  // Question préparée depuis la console « Bourse & Dashboard IA » (lue une seule fois)
  const [input, setInput] = useState('');
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem('mi-ai-draft');
      if (!draft) return;
      sessionStorage.removeItem('mi-ai-draft');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage du navigateur, disponible seulement côté client
      setInput(draft.slice(0, 2000));
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const [local, setLocal] = useState<Msg[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void useAiUiStore.persist.rehydrate();
  }, []);

  const [loadedThread, setLoadedThread] = useState<string | null>(null);

  // Ancienne conversation ouverte depuis la liste : son historique est chargé une fois depuis le serveur
  useEffect(() => {
    const conv = ai.activeConversation;
    if (!conv || !ai.activeThreadId || conv.threadId !== ai.activeThreadId || loadedThread === ai.activeThreadId || ai.isProcessing) return;
    setLocal(
      (conv.messages ?? []).map((m, i) => ({
        id: `s-${i}`,
        role: m.role === 'user' ? 'user' : 'agent',
        content: m.role === 'user' ? String(m.content).replace(/^\[Recherche approfondie[^\]]*\]\s*/, '') : String(m.content),
        at: time(m.timestamp),
      })),
    );
    setLoadedThread(ai.activeThreadId);
  }, [ai.activeConversation, ai.activeThreadId, ai.isProcessing, loadedThread]);
  const messages = local;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, ai.isProcessing]);

  const suggestions = useMemo(() => {
    const own = session?.brands ?? [];
    if (!isPartner || !own.length) return CEO_PROMPT_SUGGESTIONS;
    const b = own.join(', ');
    return [
      { category: 'Mes marques', title: `Comment se porte ${b} ?`, prompt: `Comment se portent mes marques (${b}) : part de marché, évolution, présence en points de vente ? Où progresser ?`, icon: '', depth: 'standard' as const },
      { category: 'Stock', title: 'Où suis-je en rupture ?', prompt: `Où mes marques (${b}) sont-elles en rupture et combien de ventes cela coûte-t-il ?`, icon: '', depth: 'standard' as const },
      ...CEO_PROMPT_SUGGESTIONS.slice(2),
    ];
  }, [isPartner, session]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || ai.isProcessing || q.length > 2000) return;
    setInput('');
    const now = Date.now();
    setLocal((prev) => [...prev, { id: `u-${now}`, role: 'user', content: q, at: time() }]);
    try {
      const res = mode === 'research' ? await ai.runDeepResearch({ query: q }) : await ai.sendMessage({ message: q });
      setLoadedThread(res.threadId);
      setLocal((prev) => [...prev, { id: `a-${now}`, role: 'agent', content: res.reply, at: time(), facts: res.facts }]);
    } catch (e) {
      // Agent indisponible : on le dit, puis réponse calculée localement à partir des chiffres affichés (signalée comme telle)
      const fallback = answerMarketQuestion(q, { overview, products: productsData?.products, brands: brandsData?.brands, zones: geoData?.zones, contextSummary: ai.contextSummary });
      setLocal((prev) => [
        ...prev,
        { id: `e-${now}`, role: 'error', content: aiErrorMessage(e), at: time() },
        { id: `l-${now}`, role: 'local', content: fallback.content, at: time() },
      ]);
    }
  };

  const copy = (m: Msg) => {
    void navigator.clipboard?.writeText(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportConversation = () => {
    const title = ai.activeConversation?.title || 'Conversation Agent IA';
    const body = messages
      .filter((m) => m.role !== 'error')
      .map((m) => `### ${m.role === 'user' ? 'Question' : m.role === 'local' ? 'Réponse calculée (sans IA)' : 'Agent IA'} — ${m.at}\n\n${m.content}`)
      .join('\n\n---\n\n');
    downloadBlob(new Blob([`# ${title}\n\nPérimètre : ${ai.contextSummary}\n\n${body}\n`], { type: 'text/markdown;charset=utf-8' }), `${fileSlug(title)}.md`);
  };

  const newConversation = () => {
    ai.newConversation();
    setLocal([]);
    setLoadedThread(null);
  };

  const k = overview?.kpis;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Bot className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Agent IA</h1>
              <Badge variant="outline" className={`text-[10px] gap-1.5 ${ai.aiOnline === false ? 'border-rose-500/40 text-rose-400' : 'border-emerald-500/40 text-emerald-400'}`}>
                <span className={`size-1.5 rounded-full ${ai.aiOnline === false ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                {ai.aiOnline === false ? 'Agent hors ligne — réponses calculées' : ai.aiOnline ? 'Agent en ligne' : 'Vérification…'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Posez vos questions en français : l&apos;agent répond uniquement à partir des chiffres réels du périmètre filtré, et vous montre les chiffres utilisés.
            </p>
          </div>
        </div>
      </div>

      <FilterBar />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Conversations */}
        <div className="space-y-3">
          <button onClick={newConversation} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold h-9">
            <MessageSquarePlus className="size-4" /> Nouvelle conversation
          </button>
          <Card className="p-2 border-border/70 bg-card/60">
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-background/70">
              {([['chat', 'Réponse rapide', Cpu], ['research', 'Approfondie', Compass]] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => set({ mode: key })} className={`relative py-1.5 rounded-md text-[11px] flex items-center justify-center gap-1.5 ${mode === key ? 'text-white' : 'text-muted-foreground'}`}>
                  {mode === key && <motion.span layoutId="ai-mode" className="absolute inset-0 rounded-md bg-amber-500" transition={{ duration: 0.25, ease: EASE }} />}
                  <Icon className="relative size-3.5" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-2 border-border/70 bg-card/60">
            <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Mes conversations ({ai.threads.length})</p>
            <div className="scroll-thin max-h-[40vh] overflow-y-auto space-y-1 pr-1">
              {ai.isLoadingThreads && <p className="px-2 py-2 text-[11px] text-muted-foreground">Chargement…</p>}
              {!ai.isLoadingThreads && ai.threads.length === 0 && <p className="px-2 py-2 text-[11px] text-muted-foreground">Aucune conversation pour l&apos;instant.</p>}
              <AnimatePresence initial={false}>
                {ai.threads.map((t) => (
                  <motion.div key={t.threadId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                    onClick={() => { if (t.threadId === ai.activeThreadId) return; ai.setActiveThreadId(t.threadId); setLocal([]); setLoadedThread(null); }}
                    className={`group cursor-pointer rounded-lg px-2 py-1.5 flex items-center justify-between gap-2 text-[11px] ${ai.activeThreadId === t.threadId ? 'bg-amber-500/10 text-foreground' : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'}`}>
                    <span className="truncate">{t.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); void ai.deleteThread(t.threadId); }} className="opacity-0 group-hover:opacity-100 hover:text-rose-400" aria-label="Supprimer la conversation">
                      <Trash2 className="size-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Card>
          <Card className="p-3 border-border/70 bg-card/60 text-[11px] space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Périmètre envoyé à l&apos;agent</p>
            <p className="text-foreground">{ai.contextSummary}</p>
            {k && <p className="text-muted-foreground">{k.analyzedTransactions.toLocaleString('fr-FR')} ventes · {k.activePos.toLocaleString('fr-FR')} points de vente</p>}
          </Card>
        </div>

        {/* Discussion */}
        <Card className="border-border/70 bg-card/50 flex flex-col h-[72vh] min-h-[480px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
            <span className="text-xs font-semibold truncate">{ai.activeConversation?.title || 'Nouvelle conversation'}</span>
            {messages.length > 0 && (
              <button onClick={exportConversation} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                <Download className="size-3.5" /> Exporter
              </button>
            )}
          </div>

          <div className="scroll-thin flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
            {messages.length === 0 && !ai.isProcessing && (
              <div className="py-6 space-y-4">
                <div className="text-center space-y-1">
                  <Sparkles className="size-6 text-amber-500 mx-auto" />
                  <p className="text-sm font-semibold">Que voulez-vous savoir sur votre marché ?</p>
                  <p className="text-xs text-muted-foreground">Choisissez une question ou écrivez la vôtre.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {suggestions.map((s, i) => (
                    <motion.button key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
                      onClick={() => void send(s.prompt)} className="text-left rounded-xl border border-border/70 bg-background/40 p-3 hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors">
                      <span className="text-[10px] uppercase tracking-wide text-amber-500">{s.category}</span>
                      <span className="block text-xs font-semibold mt-0.5">{s.title}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => <Bubble key={m.id} m={m} onCopy={copy} copied={copiedId === m.id} />)}
            {ai.isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="size-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white"><Bot className="size-4" /></div>
                <span className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="size-1.5 rounded-full bg-amber-500" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </span>
                {ai.currentStep}
              </motion.div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border-t border-border/60 p-3 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={2}
              placeholder={mode === 'research' ? 'Analyse approfondie : posez une question large…' : 'Votre question…'}
              className="flex-1 resize-none rounded-xl border border-border bg-background/70 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <button type="submit" disabled={!input.trim() || ai.isProcessing} className="h-10 w-10 shrink-0 rounded-xl bg-amber-500 text-white flex items-center justify-center disabled:opacity-40" aria-label="Envoyer">
              <Send className="size-4" />
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
