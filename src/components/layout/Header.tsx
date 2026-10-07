'use client';

import React, { useState } from 'react';
import {
  Bell,
  Download,
  Search,
  Bot,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDataCoverageQuery, useMarketOverview } from '@/hooks/market/useMarketQueries';
import { formatGrowth } from '@/utils/metrics';

interface HeaderProps {
  onOpenAiChat: () => void;
  onOpenExport: () => void;
  onToggleSidebar?: () => void;
}

export function Header({ onOpenAiChat, onOpenExport, onToggleSidebar }: HeaderProps) {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const { data: coverage } = useDataCoverageQuery();
  const totalSales = coverage?.networkOverview?.totalAnalyzedTransactions;

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-2">
      {/* Mobile Menu Trigger & Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden size-9 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="size-5" />
          </Button>
        )}

        <div className="relative w-full" suppressHydrationWarning>
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher produit, marque, commune..."
            className="pl-8.5 h-8.5 text-xs bg-background/60 border-border/80 focus-visible:ring-1 focus-visible:ring-primary w-full"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Sample Status Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Échantillon : <strong>{typeof totalSales === 'number' ? totalSales.toLocaleString('fr-FR') : '…'}</strong>{' '}
            ventes réelles
          </span>
        </div>

        {/* DeerFlow AI Assistant Trigger Button */}
        <Button
          onClick={onOpenAiChat}
          size="sm"
          className="h-8.5 px-2.5 sm:px-3 gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm border-0 font-medium text-xs"
        >
          <Bot className="size-3.5 sm:size-4 shrink-0" />
          <span className="hidden sm:inline">Agent IA</span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-1 py-0.5 rounded hidden xs:inline">
            DeerFlow
          </span>
        </Button>

        {/* Export Report Button */}
        <Button
          onClick={onOpenExport}
          variant="outline"
          size="sm"
          className="h-8.5 px-2.5 sm:px-3 gap-1.5 text-xs border-border/80 bg-background/50 hover:bg-accent"
          title="Exporter le rapport complet"
        >
          <Download className="size-3.5 text-muted-foreground" />
          <span className="hidden md:inline">Export</span>
        </Button>

        {/* Notifications & Alerts */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="size-8.5 rounded-lg relative hover:bg-accent/60"
            aria-label="Alertes marché"
          >
            <Bell className="size-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-background" />
          </Button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card/95 backdrop-blur-2xl shadow-2xl p-4 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground">Alertes Marché en direct</span>

                </div>
                <button
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <HeaderAlertsList />
            </div>
          )}
        </div>

        {/* User / Partner Profile Pill */}
        <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-border">
          <div className="size-7 sm:size-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-800 border border-border flex items-center justify-center text-[11px] sm:text-xs font-semibold text-white">
            CI
          </div>
          <div className="hidden 2xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-none">Brasserie Partenaire</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-1">Analyste FMCG</span>
          </div>
        </div>
      </div>
    </header>
  );
}


/** Alertes réelles calculées par l'API (chargées uniquement à l'ouverture du menu) */
function HeaderAlertsList() {
  const { data, isLoading, isError } = useMarketOverview();
  const alerts = data?.alerts ?? [];

  if (isLoading) return <p className="text-xs text-muted-foreground">Chargement des signaux…</p>;
  if (isError) return <p className="text-xs text-rose-400">API Market Intelligence indisponible.</p>;
  if (alerts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucune variation significative détectée sur le périmètre filtré.
      </p>
    );
  }

  return (
    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
      {alerts.map((alt) => (
        <div
          key={alt.id}
          className="p-2.5 rounded-lg border border-border/60 bg-background/50 hover:bg-accent/40 transition-colors text-xs flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground text-[11px] truncate max-w-[200px] sm:max-w-[240px]">
              {alt.title}
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatGrowth(alt.variation)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {alt.category} — {alt.coveragePos} points de vente, confiance {alt.confidence}
          </p>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-1">
            <span>{alt.zone}</span>
            <span>{alt.period}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
