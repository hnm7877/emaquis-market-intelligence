'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AiChatMessage } from '@/types/market';
import { answerMarketQuestion } from '@/lib/marketAnalyst';
import {
  useBrandsQuery,
  useGeographyQuery,
  useMarketOverview,
  useProductsQuery,
} from '@/hooks/market/useMarketQueries';

export default function AiIntelligencePage() {
  const { data: overview } = useMarketOverview();
  const { data: productsData } = useProductsQuery();
  const { data: brandsData } = useBrandsQuery();
  const { data: geoData } = useGeographyQuery();

  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: '1',
      sender: 'agent',
      content:
        "Bienvenue dans l'interface Agent IA E-Maquis Market Intelligence.\n\nJe réponds uniquement à partir des ventes réellement observées dans le réseau E-Maquis (filtres actifs du tableau de bord). Si les données sont insuffisantes, je vous le dis. Posez vos questions sur les produits, les zones, les marques, les catégories ou les signaux de marché.",
      timestamp: 'Initialisé',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const q = input;
    setInput('');
    const answer = answerMarketQuestion(q, {
      overview,
      products: productsData?.products,
      brands: brandsData?.brands,
      zones: geoData?.zones,
    });
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `${now}`, sender: 'user', content: q, timestamp: "À l'instant" },
      { id: `${now + 1}`, sender: 'agent', timestamp: "À l'instant", ...answer },
    ]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="size-5 text-orange-500" />
            Agent IA Market Intelligence (DeerFlow)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Questions en langage naturel, réponses calculées sur les ventes observées (agent DeerFlow à venir).
          </p>
        </div>
      </div>

      <Card className="border border-border/80 bg-card/70 backdrop-blur-md h-[560px] flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                  m.sender === 'user'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-accent/60 text-foreground border border-border/60'
                }`}
              >
                {m.content}
                {m.sampleMetadata && (
                  <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    <span>
                      {m.sampleMetadata.coverage} ({m.sampleMetadata.transactions.toLocaleString('fr-FR')} ventes) —{' '}
                      {m.sampleMetadata.period}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border bg-card/40 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Posez votre question à l'Agent IA..."
            className="h-9 text-xs bg-background/80"
          />
          <Button onClick={handleSend} className="size-9 bg-primary text-primary-foreground">
            <Send className="size-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
