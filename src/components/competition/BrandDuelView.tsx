'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, MapPin, Plus, Scale, Trophy, X } from 'lucide-react';
import { useBrandsQuery } from '@/hooks/market/useMarketQueries';
import type { BrandRow } from '@/lib/validations/market.schemas';
import { InfoTip } from '@/components/ui/InfoTip';

const EASE = [0.23, 1, 0.32, 1] as const;
const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#a78bfa'];
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const compact = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.abs(n) >= 10_000 ? `${(n / 1000).toFixed(1)} k` : int(n));

const METRICS: { label: string; help: string; get: (b: BrandRow) => number | null | undefined; show: (b: BrandRow) => string; better: 'high' | 'low' }[] = [
  { label: 'Part de marché', help: 'Part de la marque dans tout le volume vendu sur la période.', get: (b) => b.marketShare, show: (b) => `${b.marketShare} %`, better: 'high' },
  { label: "Chiffre d'affaires", help: 'Total encaissé par les établissements pour la marque.', get: (b) => b.revenue, show: (b) => `${compact(b.revenue)} F`, better: 'high' },
  { label: 'Évolution', help: 'Variation des ventes vs la période précédente de même durée.', get: (b) => b.growth, show: (b) => (b.growth == null ? '—' : `${b.growth >= 0 ? '+' : ''}${b.growth} %`), better: 'high' },
  { label: 'Présence', help: 'Part des maquis actifs qui vendent la marque.', get: (b) => b.penetrationRate, show: (b) => `${b.penetrationRate} %`, better: 'high' },
  { label: 'Maquis vendeurs', help: 'Nombre de maquis qui ont vendu la marque.', get: (b) => b.activePosCount, show: (b) => int(b.activePosCount), better: 'high' },
  { label: 'Produits vendus', help: 'Nombre de produits de la marque vendus sur la période (largeur de gamme réellement vendue).', get: (b) => b.activeProducts, show: (b) => int(b.activeProducts), better: 'high' },
  { label: 'Prix moyen payé', help: 'Prix moyen réellement payé par unité (le moins cher est mis en avant).', get: (b) => b.avgSalePrice, show: (b) => (b.avgSalePrice == null ? '—' : `${int(b.avgSalePrice)} F`), better: 'low' },
  { label: 'Marge établissement', help: 'Marge moyenne des établissements sur la marque.', get: (b) => b.marginRate, show: (b) => (b.marginRate == null ? '—' : `${b.marginRate} %`), better: 'high' },
  { label: 'Produits en rupture', help: 'Produits de la marque avec un risque de rupture élevé (le moins est mis en avant).', get: (b) => b.productsAtRisk, show: (b) => int(b.productsAtRisk), better: 'low' },
];

/** Duel de 2 à 4 marques à partir des données marques poussées par WebSocket */
export function BrandDuelView() {
  const { data, isLoading } = useBrandsQuery();
  const brands: BrandRow[] = useMemo(() => ((data?.brands || []) as BrandRow[]).filter((b) => b.volume > 0).sort((a, b) => b.volume - a.volume), [data]);
  const [picked, setPicked] = useState<string[] | null>(null);
  const ids = useMemo(() => (picked ?? brands.slice(0, 2).map((b) => b.id)).filter((id) => brands.some((b) => b.id === id)), [picked, brands]);
  const sel = useMemo(() => ids.map((id) => brands.find((b) => b.id === id)!) as BrandRow[], [ids, brands]);

  const score = useMemo(() => {
    const pts: Record<string, number> = Object.fromEntries(sel.map((b) => [b.id, 0]));
    METRICS.forEach((m) => {
      const vals = sel.map((b) => ({ id: b.id, v: m.get(b) })).filter((x) => x.v != null) as { id: string; v: number }[];
      if (vals.length < 2) return;
      const best = m.better === 'high' ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v));
      const w = vals.filter((x) => x.v === best);
      if (w.length === 1) pts[w[0].id] += 1;
    });
    return pts;
  }, [sel]);

  // Communes : part locale de chaque marque (ses communes clés remontées par l'API)
  const communes = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    sel.forEach((b) => b.localShares.forEach((c) => m.set(c.commune, { ...(m.get(c.commune) || {}), [b.id]: c.localShare })));
    return [...m.entries()]
      .map(([commune, shares]) => ({ commune, shares, total: Object.values(shares).reduce((a, x) => a + x, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [sel]);

  if (isLoading && !brands.length) return <div className="h-80 animate-pulse rounded-xl bg-muted/40" />;
  if (brands.length < 2) return <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground">Il faut au moins deux marques avec des ventes.</div>;

  const colorOf = (id: string) => COLORS[Math.max(0, ids.indexOf(id))];
  const insights: string[] = [];
  const bySh = [...sel].sort((a, b) => b.marketShare - a.marketShare);
  if (bySh[1]) insights.push(`${bySh[0].name} pèse ${(bySh[0].marketShare / Math.max(0.1, bySh[1].marketShare)).toFixed(1)} fois plus que ${bySh[1].name} en volume.`);
  const fast = [...sel].filter((b) => b.growth != null).sort((a, b) => (b.growth as number) - (a.growth as number))[0];
  if (fast && fast.id !== bySh[0].id && (fast.growth ?? 0) > (bySh[0].growth ?? 0)) insights.push(`${fast.name} progresse plus vite que ${bySh[0].name} : l’écart se réduit.`);
  const pen = [...sel].sort((a, b) => b.penetrationRate - a.penetrationRate)[0];
  if (pen && pen.id !== bySh[0].id) insights.push(`${pen.name} est présente dans plus de maquis (${pen.penetrationRate} %) sans être n° 1 en volume : sa rotation par maquis est plus faible.`);
  communes.forEach((c) => {
    const vals = sel.map((b) => ({ b, v: c.shares[b.id] })).filter((x) => x.v != null);
    if (vals.length >= 2 && vals.every((x) => x.v >= 30)) insights.push(`${c.commune} est un terrain disputé : ${vals.map((x) => `${x.b.name} ${x.v} %`).join(', ')}.`);
  });

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 p-3">
        {sel.map((b, i) => (
          <span key={b.id} className="flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2 text-xs" style={{ borderColor: `${COLORS[i]}80`, background: `${COLORS[i]}14` }}>
            <span className="size-2.5 rounded-full" style={{ background: COLORS[i] }} />
            <span className="font-semibold">{b.name}</span>
            {sel.length > 2 && (
              <button onClick={() => setPicked(ids.filter((x) => x !== b.id))} aria-label="Retirer" className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {sel.length < 4 && (
          <label className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
            <Plus className="size-3" />
            <select value="" onChange={(e) => e.target.value && setPicked([...ids, e.target.value])} className="cursor-pointer bg-transparent focus:outline-none">
              <option value="">Ajouter une marque</option>
              {brands
                .filter((b) => !ids.includes(b.id))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.marketShare} %)
                  </option>
                ))}
            </select>
          </label>
        )}
      </section>

      <div className={`grid gap-3 ${sel.length === 2 ? 'md:grid-cols-2' : sel.length === 3 ? 'md:grid-cols-3' : 'grid-cols-2 xl:grid-cols-4'}`}>
        {sel.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05, ease: EASE }} className="rounded-xl border bg-card/60 p-3" style={{ borderColor: `${COLORS[i]}66` }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">{b.name}</div>
              <span className="text-[11px]">
                <b style={{ color: COLORS[i] }}>{score[b.id] || 0} pts</b> <span className="text-muted-foreground">sur {METRICS.length}</span>
              </span>
            </div>
            <div className="mt-2 font-mono text-2xl font-black" style={{ color: COLORS[i] }}>
              {b.marketShare} %
            </div>
            <div className="text-[11px] text-muted-foreground">du marché · {b.topCategory || '—'}</div>
          </motion.div>
        ))}
      </div>

      <section className="rounded-xl border border-border/70 bg-card/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Scale className="size-4 text-amber-500" /> Le duel des marques
          <InfoTip title="Duel des marques" text="Chaque ligne donne 1 point à la meilleure marque (la plus haute, ou la plus basse pour le prix et les ruptures)." />
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-muted-foreground">
                <th className="py-1.5 text-left font-medium">Critère</th>
                {sel.map((b, i) => (
                  <th key={b.id} className="py-1.5 text-right font-medium" style={{ color: COLORS[i] }}>
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => {
                const vals = sel.map((b) => m.get(b));
                const known = vals.filter((v): v is number => v != null);
                const best = known.length >= 2 ? (m.better === 'high' ? Math.max(...known) : Math.min(...known)) : null;
                return (
                  <tr key={m.label} className="border-t border-border/50">
                    <td className="py-2">
                      <span className="inline-flex items-center text-muted-foreground">
                        {m.label}
                        <InfoTip title={m.label} text={m.help} />
                      </span>
                    </td>
                    {sel.map((b, i) => {
                      const win = best != null && vals[i] === best && known.filter((v) => v === best).length === 1;
                      return (
                        <td key={b.id} className={`py-2 text-right font-mono ${win ? 'font-bold' : 'text-muted-foreground'}`} style={win ? { color: COLORS[i] } : undefined}>
                          {win && <Trophy className="mr-1 inline size-3" />}
                          {m.show(b)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4 text-rose-500" /> Part locale dans les communes clés
          <InfoTip title="Part locale" text="Part de chaque marque dans tout ce qui se vend dans la commune (toutes marques confondues). Seules les communes clés de chaque marque sont connues ici." />
        </h2>
        <div className="space-y-2">
          {communes.map((c) => (
            <div key={c.commune} className="grid grid-cols-[130px_1fr] items-center gap-3 text-[11px]">
              <span className="truncate font-medium">{c.commune}</span>
              <div className="space-y-0.5">
                {sel.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      {c.shares[b.id] != null && <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, c.shares[b.id])}%`, background: colorOf(b.id) }} />}
                    </div>
                    <span className="w-12 text-right font-mono text-muted-foreground">{c.shares[b.id] != null ? `${c.shares[b.id]} %` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!communes.length && <p className="text-[11px] text-muted-foreground">Aucune commune localisée.</p>}
        </div>
      </section>

      {insights.length > 0 && (
        <section className="rounded-xl border border-border/70 bg-card/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-amber-500" /> À retenir
          </h2>
          <ul className="grid gap-2 text-[12px] md:grid-cols-2">
            {insights.slice(0, 8).map((t) => (
              <li key={t} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
