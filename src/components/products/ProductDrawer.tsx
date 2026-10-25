'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Boxes, Lightbulb, MapPin, Package, RefreshCw, Store, Tag, X } from 'lucide-react';
import type { ProductItem } from '@/lib/validations/market.schemas';
import { resolveProductImage } from '@/utils/productImages';
import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';
import { PriceLadder } from './PriceLadder';
import { ProductDetailTabs } from './ProductDetailTabs';

const EASE = [0.23, 1, 0.32, 1] as const;
const F = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n).toLocaleString('fr-FR')} F`);
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));

export const RISK_META: Record<string, { label: string; cls: string }> = {
  HIGH: { label: 'Élevé', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  MEDIUM: { label: 'Modéré', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  LOW: { label: 'Faible', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  UNKNOWN: { label: 'Stock inconnu', cls: 'bg-muted text-muted-foreground border-border' },
};

/** Conseils calculés à partir des chiffres du produit (aucune donnée inventée) */
function advice(p: ProductItem): string[] {
  const out: string[] = [];
  const pr = p.pricing;
  const st = p.stock;
  if (pr?.shelfPrice && pr.shelfPrice.count >= 3) {
    const spread = pr.shelfPrice.p75 / Math.max(1, pr.shelfPrice.p25);
    if (spread >= 1.2)
      out.push(`Prix très dispersés : la moitié des établissements vend entre ${F(pr.shelfPrice.p25)} et ${F(pr.shelfPrice.p75)}. Un prix conseillé harmoniserait le marché.`);
  }
  if (pr?.marginRate != null) {
    if (pr.marginRate >= 35) out.push(`Marge confortable pour les établissements (${pr.marginRate} %) : une hausse du prix de livraison reste possible sans freiner les ventes.`);
    else if (pr.marginRate < 15) out.push(`Marge faible pour les établissements (${pr.marginRate} %) : un geste sur le prix du casier / carton peut relancer les commandes.`);
  }
  if (st && st.trackedPos > 0 && (p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'MEDIUM'))
    out.push(`${st.outOfStockPos} établissement(s) en rupture et ${st.lowCoverPos} avec moins de 3 jours de stock : prévoir une livraison.`);
  if (p.reorderFrequencyDays != null) out.push(`Les établissements se réapprovisionnent en moyenne tous les ${p.reorderFrequencyDays} jours.`);
  if (p.growth != null && p.growth <= -10) out.push(`Ventes en recul de ${Math.abs(p.growth).toFixed(1)} % : vérifier la concurrence et la disponibilité dans les communes clés.`);
  if (p.growth != null && p.growth >= 10) out.push(`Ventes en hausse de ${p.growth.toFixed(1)} % : sécuriser les stocks dans ${p.topCommunes.slice(0, 2).join(' et ') || 'les communes clés'}.`);
  return out;
}

export function ProductDrawer({ product, unit, onClose }: { product: ProductItem | null; unit: DisplayVolumeUnit; onClose: () => void }) {
  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px] overflow-y-auto border-l border-border bg-background p-5 shadow-2xl"
          >
            <Body p={product} unit={unit} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Body({ p, unit, onClose }: { p: ProductItem; unit: DisplayVolumeUnit; onClose: () => void }) {
  const img = resolveProductImage(p.image ?? null, p.name, p.brand);
  const pr = p.pricing;
  const st = p.stock;
  const risk = RISK_META[p.stockoutRisk] || RISK_META.UNKNOWN;
  const tips = advice(p);
  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {img ? <img src={img} alt="" className="size-full object-contain" /> : <Package className="size-6 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight">{p.name}</h2>
          <p className="text-xs text-muted-foreground">
            {p.brand} · {p.category} {p.format ? `· ${p.format}` : ''}
          </p>
          <span className={`mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${risk.cls}`}>Risque de rupture : {risk.label}</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fermer">
          <X className="size-4" />
        </button>
      </header>

      <section className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Kpi label="Volume" value={formatProductVolume(p.volume, unit, p.name, p.format).formatted} />
        <Kpi label="Chiffre d'affaires" value={F(p.revenue ?? 0)} />
        <Kpi label="Maquis vendeurs" value={int(p.posCount)} />
        <Kpi label="Rotation" value={`${p.rotationRate} / sem.`} hint="par maquis" />
      </section>

      <section className="rounded-xl border border-border p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Tag className="size-4 text-amber-500" /> Prix de vente
        </h3>
        <PriceLadder shelf={pr?.shelfPrice ?? null} avgSale={pr?.avgSalePrice ?? null} unitCost={pr?.unitCost ?? null} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-emerald-400" /> Prix moyen encaissé : <b className="text-foreground">{F(pr?.avgSalePrice)}</b>
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-full bg-amber-500/70" /> Moitié des établissements
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.5 rotate-45 rounded-sm bg-cyan-400" /> Coût d&apos;achat : <b className="text-foreground">{F(pr?.unitCost)}</b>
            {pr?.unitCostSource && <em className="not-italic">({pr.unitCostSource})</em>}
          </span>
        </div>
        {pr?.shelfPrice && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Prix affiché dans {pr.shelfPrice.count} établissement(s) : de {F(pr.shelfPrice.min)} à {F(pr.shelfPrice.max)}, médiane {F(pr.shelfPrice.median)}.
          </p>
        )}
        {pr?.unitMargin != null && (
          <p className="mt-1 text-[11px]">
            Marge moyenne des établissements : <b className={pr.unitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{F(pr.unitMargin)}</b> par bouteille ({pr.marginRate} %)
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Boxes className="size-4 text-cyan-500" /> Prix d&apos;achat casier / carton
        </h3>
        {pr?.containers?.length ? (
          <table className="mt-2 w-full text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Contenant</th>
                <th className="py-1 text-right font-medium">Prix moyen</th>
                <th className="py-1 text-right font-medium">Bouteilles</th>
                <th className="py-1 text-right font-medium">Par bouteille</th>
                <th className="py-1 text-right font-medium">Achats</th>
              </tr>
            </thead>
            <tbody>
              {pr.containers.map((c) => (
                <tr key={c.type} className="border-t border-border/60">
                  <td className="py-1.5 capitalize">{c.type}</td>
                  <td className="py-1.5 text-right font-mono font-semibold">{F(c.avgPrice)}</td>
                  <td className="py-1.5 text-right">{c.bottlesPerContainer}</td>
                  <td className="py-1.5 text-right font-mono">{F(c.avgPrice / c.bottlesPerContainer)}</td>
                  <td className="py-1.5 text-right text-muted-foreground">
                    {c.lots} · {c.establishments} étab.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Aucun achat avec prix enregistré pour ce produit (les établissements saisissent le prix du casier ou du carton à la réception d&apos;une livraison).
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Store className="size-4 text-violet-500" /> Stock dans les établissements
        </h3>
        {st && st.trackedPos > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <Kpi label="Suivis" value={int(st.trackedPos)} hint="vendeurs avec stock connu" />
            <Kpi label="En rupture" value={int(st.outOfStockPos)} tone={st.outOfStockPos ? 'bad' : undefined} />
            <Kpi label="< 3 jours de stock" value={int(st.lowCoverPos)} tone={st.lowCoverPos ? 'warn' : undefined} />
            <Kpi label="Couverture médiane" value={st.medianDaysCover == null ? '—' : `${st.medianDaysCover} j`} />
            <Kpi label="Ventes exposées" value={st.exposedSalesShare == null ? '—' : `${Math.round(st.exposedSalesShare * 100)} %`} />
            <Kpi label="Ruptures sur la période" value={int(st.stockoutEvents)} hint={`${st.stockoutEstablishments} étab.`} />
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">Stock des établissements pas encore synchronisé pour ce produit.</p>
        )}
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <RefreshCw className="size-3" /> Réassort observé : {p.reorderFrequencyDays != null ? `tous les ${p.reorderFrequencyDays} jours` : 'pas assez d’historique'}
        </p>
      </section>

      <ProductDetailTabs productId={p.id} productName={p.name} />

      {p.topCommunes.length > 0 && (
        <section className="rounded-xl border border-border p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="size-4 text-rose-500" /> Communes où il se vend le plus
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.topCommunes.map((c, i) => (
              <span key={c} className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                {i + 1}. {c}
              </span>
            ))}
          </div>
        </section>
      )}

      {tips.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-amber-500" /> Pistes pour le distributeur
          </h3>
          <ul className="mt-2 space-y-1.5 text-[12px]">
            {tips.map((t) => (
              <li key={t} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'bad' | 'warn' }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`truncate font-mono text-sm font-semibold ${tone === 'bad' ? 'text-rose-400' : tone === 'warn' ? 'text-amber-400' : ''}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
