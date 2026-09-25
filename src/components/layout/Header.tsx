'use client';

import React, { useState } from 'react';
import {
  Bell,
  Download,
  Search,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ALERTS_DATA } from '@/data/mockMarketData';

interface HeaderProps {
  onOpenAiChat: () => void;
  onOpenExport: () => void;
}

export function Header({ onOpenAiChat, onOpenExport }: HeaderProps) {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full" suppressHydrationWarning>
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher produit, marque, commune (ex: Bock, Yopougon, Solibra)..."
            className="pl-9 h-9 text-xs bg-background/60 border-border/80 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Sample Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Échantillon Certifié : <strong>57 744</strong> ventes E-Maquis</span>
        </div>

        {/* DeerFlow AI Assistant Trigger Button */}
        <Button
          onClick={onOpenAiChat}
          size="sm"
          className="h-9 px-3 gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm border-0 font-medium text-xs"
        >
          <Bot className="size-4" />
          <span className="hidden sm:inline">Demander à l&apos;Agent IA</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-1 py-0.5 rounded">
            DeerFlow
          </span>
        </Button>

        {/* Export Report Button */}
        <Button
          onClick={onOpenExport}
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-2 text-xs border-border/80 bg-background/50 hover:bg-accent"
        >
          <Download className="size-4 text-muted-foreground" />
          <span className="hidden sm:inline">Exporter Rapport</span>
        </Button>

        {/* Notifications & Alerts */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="size-9 rounded-lg relative hover:bg-accent/60"
            aria-label="Alertes marché"
          >
            <Bell className="size-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-background" />
          </Button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-96 rounded-xl border border-border bg-card/95 backdrop-blur-2xl shadow-2xl p-4 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground">Alertes Marché en direct</span>
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {ALERTS_DATA.length} nouvelles
                  </Badge>
                </div>
                <button
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Fermer
                </button>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {ALERTS_DATA.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-2.5 rounded-lg border border-border/60 bg-background/50 hover:bg-accent/40 transition-colors text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-[11px] truncate max-w-[240px]">
                        {alt.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        {alt.variation}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {alt.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-1">
                      <span>{alt.zone}</span>
                      <span>{alt.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User / Partner Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="size-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 border border-border flex items-center justify-center text-xs font-semibold text-white">
            CI
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-none">Brasserie Partenaire</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-1">Analyste FMCG</span>
          </div>
        </div>
      </div>
    </header>
  );
}
