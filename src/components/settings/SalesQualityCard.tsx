'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { InfoTip } from '@/components/ui/InfoTip';
import { useSalesQualityQuery } from '@/hooks/market/useMarketQueries';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number) => Math.round(n).toLocaleString('fr-FR');
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

function Gauge({ label, value, hint }: { label: string; value: number; hint: string }) {
  const tone = value >= 95 ? 'bg-emerald-500' : value >= 80 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <strong className="tabular-nums">{value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</strong>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
        <motion.div className={`h-full rounded-full ${tone}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.8, ease: EASE }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Qualité de la collection des ventes (comptages réels sur toute la collection, administrateurs) :
 * montre ce que les vues doivent compenser (dates manquantes, lignes non rattachées au catalogue…).
 */
export function SalesQualityCard() {
  const { data: q, isLoading, isError } = useSalesQualityQuery();
  return (
    <Card className="space-y-4 border border-border/80 bg-card/70 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Database className="size-4 text-amber-500" /> Qualité de la base des ventes
        <InfoTip
          title="Qualité des ventes"
          text="Comptages réels sur toute la collection des ventes. Les vues tiennent déjà compte de ces cas (date de secours, rattachement par nom) ; un taux bas indique des caisses à mettre à jour ou des données anciennes."
        />
      </div>
      {isLoading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Analyse de la collection…</p>
      ) : isError || !q ? (
        <p className="text-xs text-rose-400">Qualité des ventes indisponible.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            {[
              ['Ventes enregistrées', int(q.sales)],
              ['Lignes de produits', int(q.lines)],
              ['Première vente', day(q.firstSaleDate)],
              ['Dernière vente', day(q.lastSaleDate)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border/50 bg-background/50 p-2.5">
                <span className="block text-[10px] text-muted-foreground">{l}</span>
                <span className="font-semibold text-foreground">{v}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <Gauge
              label="Ventes datées"
              value={q.datedShare}
              hint={`${int(q.undated)} vente(s) sans date${q.textDates ? ` · ${int(q.textDates)} date(s) enregistrée(s) en texte (lues quand même)` : ''}.`}
            />
            <Gauge
              label="Lignes rattachées au catalogue"
              value={q.catalogLinkShare}
              hint={`${int(q.lines - q.linesWithCatalogId)} ligne(s) sans identifiant catalogue, dont ${int(q.linesUnidentified)} sans nom (impossibles à attribuer à un produit).`}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {int(q.canceled)} vente(s) annulée(s) (exclues des analyses par défaut) · {int(q.noEstablishment)} vente(s) sans établissement ni compte ·{' '}
            {int(q.promoLines)} ligne(s) vendue(s) au prix promo.
            {q.checkedAt ? ` Vérifié le ${new Date(q.checkedAt).toLocaleString('fr-FR')}.` : ''}
          </p>
        </>
      )}
    </Card>
  );
}
