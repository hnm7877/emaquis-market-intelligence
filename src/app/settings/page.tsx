'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, History, RefreshCw, Database, Loader2 } from 'lucide-react';
import { useAuditLogsQuery, useSyncStatusQuery, marketQueryKeys } from '@/hooks/market/useMarketQueries';
import { startSyncBackfill } from '@/api/marketIntelligence.api';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

const STATUS_STYLES: Record<string, string> = {
  AUTHORIZED: 'text-emerald-400',
  RATE_LIMITED: 'text-amber-400',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: logs, isLoading: logsLoading, isError: logsError } = useAuditLogsQuery();
  const { data: sync, isLoading: syncLoading } = useSyncStatusQuery();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const backfill = sync?.backfill;

  const handleBackfill = async () => {
    setStarting(true);
    setStartError(null);
    try {
      await startSyncBackfill();
      await queryClient.invalidateQueries({ queryKey: marketQueryKeys.syncStatus() });
    } catch {
      setStartError("Impossible de lancer l'import initial.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="size-5 text-orange-500" />
            Paramètres &amp; Journal d&apos;Audit
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Synchronisation des données et traçabilité des consultations.
          </p>
        </div>
      </div>

      {/* Synchronisation stock / promotions */}
      <Card className="p-6 border border-border/80 bg-card/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="size-4 text-blue-500" />
            Synchronisation stock &amp; promotions
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBackfill}
            disabled={starting || backfill?.running}
            className="text-xs gap-1.5"
          >
            {starting || backfill?.running ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {backfill?.running ? 'Import en cours…' : "Lancer l'import initial"}
          </Button>
        </div>

        {syncLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : sync ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                ['Synchro dynamique', sync.enabled ? 'Active' : 'Désactivée'],
                ['Établissements suivis', sync.establishmentsWithStockData.toLocaleString('fr-FR')],
                ['Produits suivis', sync.productStates.toLocaleString('fr-FR')],
                ['Dernière synchro', fmtDate(sync.lastSyncAt)],
                ['Mouvements de stock', sync.stockMovements.toLocaleString('fr-FR')],
                ['Périodes de promotion', sync.promotionPeriods.toLocaleString('fr-FR')],
                ['Promotions actives', sync.activePromotions.toLocaleString('fr-FR')],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg border border-border/50 bg-background/50">
                  <span className="text-[10px] text-muted-foreground block">{label}</span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
            {backfill && (backfill.running || backfill.finishedAt) && (
              <p className="text-xs text-muted-foreground">
                Import initial : {backfill.tenantsDone}/{backfill.tenantsTotal} établissements,{' '}
                {backfill.productsSynced.toLocaleString('fr-FR')} produits, {backfill.errors} erreur(s)
                {backfill.finishedAt && !backfill.running ? ` — terminé le ${fmtDate(backfill.finishedAt)}` : ''}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Chaque modification de produit (vente, réassort, prix, promotion) est synchronisée automatiquement.
              L&apos;import initial récupère l&apos;état actuel des établissements existants ; il est à lancer une fois.
            </p>
          </>
        ) : (
          <p className="text-xs text-rose-400">État de synchronisation indisponible.</p>
        )}
        {startError && <p className="text-xs text-rose-400">{startError}</p>}
      </Card>

      {/* Journal d'audit */}
      <Card className="p-6 border border-border/80 bg-card/70 space-y-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="size-4 text-emerald-500" />
          Derniers accès aux données de marché
        </CardTitle>
        <div className="space-y-2 text-xs">
          {logsLoading && <p className="text-muted-foreground">Chargement du journal…</p>}
          {logsError && <p className="text-rose-400">Journal indisponible.</p>}
          {!logsLoading && !logsError && (logs?.length ?? 0) === 0 && (
            <p className="text-muted-foreground">Aucun accès journalisé pour le moment.</p>
          )}
          {logs?.map((log) => {
            const filters = Object.entries(log.filters || {})
              .map(([k, v]) => `${k}=${v}`)
              .join(' · ');
            return (
              <div
                key={log._id}
                className="p-2.5 rounded-lg border border-border/50 bg-background/50 flex flex-col sm:flex-row sm:justify-between gap-1"
              >
                <span>
                  {fmtDate(log.created_at)} — <strong>{log.subject}</strong> · {log.action} ·{' '}
                  <span className="font-mono">{log.endpoint}</span>
                  {filters && <span className="text-muted-foreground"> ({filters})</span>}
                </span>
                <span className={`font-mono ${STATUS_STYLES[log.status] ?? 'text-muted-foreground'}`}>
                  {log.status}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
