'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, Database, Loader2 } from 'lucide-react';
import { useSyncStatusQuery, useMarketSessionQuery, marketQueryKeys } from '@/hooks/market/useMarketQueries';
import { AuditPanel } from '@/components/settings/AuditPanel';
import { startSyncBackfill } from '@/api/marketIntelligence.api';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : '—');


/** Page réservée aux administrateurs E-Maquis (le serveur refuse aussi ces données aux distributeurs). */
export default function SettingsPage() {
  const { isAdmin, isPartner, isLoading } = useMarketSessionQuery();
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  // Distributeur : uniquement le journal de son compte (aucune fonction d'administration)
  if (isPartner) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="pb-2 border-b border-border/60">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="size-5 text-orange-500" /> Journal d&apos;activité
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Traçabilité des consultations faites avec votre compte.</p>
        </div>
        <AuditPanel mode="own" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <Card className="p-6 max-w-xl mx-auto text-sm text-muted-foreground">
        Cette page est réservée à l&apos;équipe E-Maquis.
      </Card>
    );
  }
  return <AdminSettings />;
}

function AdminSettings() {
  const queryClient = useQueryClient();
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
            Synchronisation stock, prix d&apos;achat &amp; promotions
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
                ['Achats casier / carton', (sync.purchaseLots ?? 0).toLocaleString('fr-FR')],
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
                {backfill.productsSynced.toLocaleString('fr-FR')} produits, {(backfill.lotsSynced ?? 0).toLocaleString('fr-FR')} achats, {backfill.errors} erreur(s)
                {backfill.finishedAt && !backfill.running ? ` — terminé le ${fmtDate(backfill.finishedAt)}` : ''}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Chaque modification de produit (vente, réassort, prix, promotion) et chaque livraison avec prix casier / carton
              est synchronisée automatiquement. L&apos;import initial récupère l&apos;état actuel et les achats déjà enregistrés
              de tous les établissements ; il est à lancer une fois (puis à relancer seulement après une mise à jour qui ajoute des données).
            </p>
          </>
        ) : (
          <p className="text-xs text-rose-400">État de synchronisation indisponible.</p>
        )}
        {startError && <p className="text-xs text-rose-400">{startError}</p>}
      </Card>

      <AuditPanel />
    </div>
  );
}
