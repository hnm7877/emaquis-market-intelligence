'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CandlestickChart, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { FilterBar } from '@/components/layout/FilterBar';
import { InfoTip } from '@/components/ui/InfoTip';
import { CandleChart } from '@/components/bourse/CandleChart';
import { ProductRadar, type RadarAxis } from '@/components/bourse/ProductRadar';
import { ProductTreemap } from '@/components/bourse/ProductTreemap';
import { ProductAvatar } from '@/components/public/ProductAvatar';
import { useProductCandlesQuery, useProductsQuery } from '@/hooks/market/useMarketQueries';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import type { Candles, CandleInterval, ProductItem } from '@/lib/validations/market.schemas';

const EASE = [0.23, 1, 0.32, 1] as const;
const F = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n).toLocaleString('fr-FR')} F`);
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`);
const tone = (v: number | null | undefined) => (v == null || v === 0 ? 'text-muted-foreground' : v > 0 ? 'text-emerald-400' : 'text-red-400');
const INTERVALS: { id: CandleInterval; label: string; hint: string }[] = [
  { id: '5m', label: '5 min', hint: '24 dernières heures' },
  { id: '1h', label: '1 h', hint: '7 derniers jours' },
  { id: '1d', label: '1 j', hint: '120 derniers jours, au jour local du pays de chaque établissement' },
];

/** Rang centile (0-100) d'une valeur parmi celles des autres produits */
function percentile(values: number[], v: number | null | undefined): number | null {
  if (v == null || !values.length) return null;
  const below = values.filter((x) => x < v).length;
  const equal = values.filter((x) => x === v).length;
  return Math.round(((below + equal / 2) / values.length) * 100);
}

/**
 * Bourse produits (après connexion) : liste des produits avec prix moyen réel, bougies de prix
 * de vente en direct, profil du produit (radar) et carte des produits de sa catégorie.
 */
export default function BoursePage() {
  const { data, isLoading } = useProductsQuery();
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const products = useMemo(() => [...((data?.products ?? []) as ProductItem[])].sort((a, b) => b.volume - a.volume), [data?.products]);
  const [selected, setSelected] = useState<string | null>(null);
  const [interval, setInterval] = useState<CandleInterval>('1h');
  const [search, setSearch] = useState('');
  const current = products.find((p) => p.id === selected) ?? products[0] ?? null;
  const { data: rawCandles, isLoading: candlesLoading } = useProductCandlesQuery(current?.id ?? null, interval);
  const candles = rawCandles as Candles | undefined;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (q ? products.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(q)) : products).slice(0, 60);
  }, [products, search]);

  const radar: RadarAxis[] = useMemo(() => {
    const vals = (f: (p: ProductItem) => number | null | undefined) => products.map(f).filter((v): v is number => v != null);
    const p = current;
    return [
      { label: 'Rentabilité', value: percentile(vals((x) => x.pricing?.marginRate), p?.pricing?.marginRate), hint: 'Marge des établissements comparée aux autres produits' },
      { label: 'Croissance', value: percentile(vals((x) => x.growth), p?.growth), hint: 'Variation des ventes vs période précédente' },
      { label: 'Rotation', value: percentile(vals((x) => x.rotationRate), p?.rotationRate), hint: 'Vitesse d’écoulement' },
      { label: 'Présence', value: percentile(vals((x) => x.posCount), p?.posCount), hint: "Nombre d'établissements qui le vendent" },
    ];
  }, [products, current]);
  const score = useMemo(() => {
    const v = radar.map((a) => a.value).filter((x): x is number => x != null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }, [radar]);

  const treemap = useMemo(
    () =>
      current
        ? products.filter((p) => p.category === current.category && p.volume > 0).slice(0, 24).map((p) => ({ id: p.id, name: p.name, size: p.volume, growth: p.growth }))
        : [],
    [products, current],
  );

  const sell = candles?.last ?? current?.pricing?.avgSalePrice ?? null;
  const buy = current?.pricing?.unitCost ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 border-b border-border/60 pb-2 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <CandlestickChart className="size-5 text-amber-500" /> Bourse produits
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Prix de vente réellement payés, produit par produit, mis à jour en direct.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-300">
          <span className={`size-1.5 rounded-full ${isConnected ? 'animate-pulse bg-emerald-500' : 'bg-zinc-500'}`} /> {isConnected ? 'En direct' : 'Hors ligne'}
        </span>
      </div>

      <FilterBar />

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Liste des produits */}
        <section aria-label="Produits" className="rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="size-2.5 rounded-sm bg-amber-500" />
            <h2 className="text-sm font-bold text-foreground">Mes produits</h2>
            <span className="text-xs text-muted-foreground">({products.length})</span>
          </div>
          <label className="mb-2 flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs">
            <Search className="size-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…" className="w-full bg-transparent outline-none placeholder:text-muted-foreground" />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4rem] gap-2 px-2 pb-1 text-[10px] text-muted-foreground">
            <span>Produit</span>
            <span className="text-right">Prix moy.</span>
            <span className="text-right">Var.</span>
          </div>
          <ul className="max-h-[560px] space-y-0.5 overflow-y-auto pr-1">
            {isLoading && !products.length && Array.from({ length: 8 }, (_, i) => <li key={i} className="h-10 animate-pulse rounded-lg bg-muted/20" />)}
            {list.map((p) => {
              const active = p.id === current?.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p.id)}
                    aria-pressed={active}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_4.5rem_4rem] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${active ? 'bg-amber-500/15 ring-1 ring-amber-500/40' : 'hover:bg-white/[0.04]'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ProductAvatar name={p.name} brand={p.brand} size={26} />
                      <span className="truncate font-semibold text-foreground">{p.name}</span>
                    </span>
                    <span className="text-right tabular-nums text-foreground">{F(p.pricing?.avgSalePrice)}</span>
                    <span className={`text-right font-semibold tabular-nums ${tone(p.growth)}`}>{pct(p.growth)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="min-w-0 space-y-4">
          {/* Bougies */}
          <section className="rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur-md sm:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              {current && <ProductAvatar name={current.name} brand={current.brand} size={34} />}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{current?.name ?? '—'}</p>
                <p className="truncate text-[11px] text-muted-foreground">{[current?.brand, current?.category].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex rounded-lg border border-border/60 p-0.5 text-xs" role="group" aria-label="Intervalle">
                {INTERVALS.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    title={i.hint}
                    aria-pressed={interval === i.id}
                    onClick={() => setInterval(i.id)}
                    className={`rounded-md px-2.5 py-1 transition-colors ${interval === i.id ? 'bg-amber-500/20 text-amber-300' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-2 text-xs">
                <span className="flex items-center gap-2 rounded-full border border-red-400/50 px-3 py-1">
                  <span className="font-bold text-red-400">V</span>
                  <span className="tabular-nums text-red-300">{F(sell)}</span>
                  <InfoTip text="Vente : dernier prix de vente unitaire observé (ou prix moyen de la période)." title="Prix de vente" />
                </span>
                <span className="flex items-center gap-2 rounded-full border border-emerald-400/50 px-3 py-1">
                  <span className="font-bold text-emerald-400">A</span>
                  <span className="tabular-nums text-emerald-300">{F(buy)}</span>
                  <InfoTip text="Achat : coût unitaire moyen payé par les établissements (lots d'achat réels)." title="Prix d'achat" />
                </span>
              </div>
            </div>
            <div className="mb-1 flex items-center gap-3 text-xs">
              <span className={`font-semibold tabular-nums ${tone(candles?.changePercent)}`}>
                {candles?.changePercent != null && (candles.changePercent >= 0 ? <TrendingUp className="mr-1 inline size-3.5" /> : <TrendingDown className="mr-1 inline size-3.5" />)}
                {pct(candles?.changePercent)} sur la période
              </span>
              {sell != null && buy != null && <span className="text-muted-foreground">Écart vente / achat : {F(sell - buy)}</span>}
            </div>
            {candles ? (
              <CandleChart data={candles} />
            ) : (
              <div className="flex h-[380px] items-center justify-center text-xs text-muted-foreground">{candlesLoading || isLoading ? 'Chargement des bougies…' : 'Choisissez un produit.'}</div>
            )}
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            {/* Profil produit */}
            <section className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-md">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  Profil du produit
                  <InfoTip text="Chaque axe classe le produit parmi tous les produits du périmètre (100 = le meilleur)." title="Profil" />
                </h2>
                <span className="text-xs text-muted-foreground">
                  Score E-Maquis <strong className="ml-1 text-base text-amber-400 tabular-nums">{score ?? '—'}</strong>
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={current?.id ?? 'none'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
                  <ProductRadar axes={radar} />
                </motion.div>
              </AnimatePresence>
              {current?.description && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{current.description}</p>}
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Unités</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{current ? current.volume.toLocaleString('fr-FR') : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Établissements</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{current?.posCount?.toLocaleString('fr-FR') ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Marge</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{current?.pricing?.marginRate != null ? `${current.pricing.marginRate} %` : '—'}</dd>
                </div>
              </dl>
            </section>

            {/* Carte de la catégorie */}
            <section className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-md">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="size-2.5 rounded-sm bg-amber-500" /> {current?.category ?? 'Catégorie'}
                <InfoTip text="Taille = unités vendues ; couleur = variation (vert hausse, rouge baisse). Cliquez pour ouvrir un produit." title="Carte de la catégorie" />
              </h2>
              <ProductTreemap items={treemap} selectedId={current?.id ?? null} onSelect={setSelected} />
            </section>
          </div>
          {candles?.methodology && <p className="text-[11px] text-muted-foreground">{candles.methodology}</p>}
        </div>
      </div>
    </div>
  );
}
