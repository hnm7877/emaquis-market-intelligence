'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowDownUp, Award, Crown, Download, Layers, Package, Search, ShieldAlert, Tag, TrendingDown, TrendingUp, UtensilsCrossed, Wine, X } from 'lucide-react';
import { useCategoriesQuery, useProductsQuery } from '@/hooks/market/useMarketQueries';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import type { ICategoryItem, ProductItem } from '@/lib/validations/market.schemas';
import { FilterBar } from '@/components/layout/FilterBar';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { InfoTip } from '@/components/ui/InfoTip';
import { ProductDrawer } from '@/components/products/ProductDrawer';
import { resolveProductImage } from '@/utils/productImages';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const compact = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.abs(n) >= 10_000 ? `${(n / 1000).toFixed(1)} k` : int(n));
const F = (n: number | null | undefined) => (n == null ? '—' : `${int(n)} F`);
/** Couleur de la catégorie (stockée avec transparence, ex. #fabf4580) rendue opaque */
const solid = (c?: string) => (c && /^#[0-9a-f]{6}/i.test(c) ? c.slice(0, 7) : '#f59e0b');

type Sort = 'volumeShare' | 'revenue' | 'growth' | 'posPenetration' | 'avgSalePrice' | 'marginRate' | 'productsAtRisk' | 'leaderShare' | 'name';
type Segment = 'all' | 'drinks' | 'food' | 'rising' | 'falling' | 'risk' | 'open';

const SEGMENTS: { id: Segment; label: string; hint: string }[] = [
  { id: 'all', label: 'Toutes', hint: 'Toutes les catégories avec des ventes' },
  { id: 'drinks', label: 'Boissons', hint: 'Catégories de boissons' },
  { id: 'food', label: 'Nourriture', hint: 'Catégories de plats et nourriture' },
  { id: 'rising', label: 'En progression', hint: 'Ventes en hausse vs période précédente' },
  { id: 'falling', label: 'En recul', hint: 'Ventes en baisse vs période précédente' },
  { id: 'risk', label: 'Produits en rupture', hint: 'Au moins un produit avec un risque de rupture élevé' },
  { id: 'open', label: 'Marchés ouverts', hint: 'Aucune marque ne dépasse 40 % de la catégorie : place à prendre' },
];

const HELP = {
  name: 'Famille de produits (bières, sucreries, vins…). Cliquez sur une ligne pour ouvrir sa fiche.',
  volumeShare: 'Part de la catégorie dans tout ce qui a été vendu sur la période (en volume).',
  revenue: "Chiffre d'affaires : total encaissé par les établissements pour cette catégorie, en francs CFA.",
  growth: 'Variation des ventes de la catégorie par rapport à la période précédente de même durée.',
  posPenetration: 'Part des maquis actifs qui ont vendu au moins un produit de cette catégorie.',
  avgSalePrice: 'Prix moyen réellement payé pour une unité de la catégorie.',
  marginRate: "Marge moyenne des établissements sur la catégorie, pondérée par les quantités (produits au prix d'achat connu).",
  productsAtRisk: 'Nombre de produits de la catégorie dont le risque de rupture est élevé (stock réel).',
  leaderShare: 'Marque qui vend le plus dans la catégorie et sa part. Au-dessus de 60 % la catégorie est dominée ; sous 40 % elle est ouverte.',
  range: 'Produits de la catégorie vendus sur la période / produits au catalogue.',
};

/**
 * Catégories : données par WebSocket (React Query, contrôle Zod), filtres globaux appliqués
 * par le serveur, recherche / segments / tri dans le navigateur (aucune requête).
 */
export default function CategoriesPage() {
  const { filters, setFilter, resetFilters } = useMarketFilterStore();
  const { data, isLoading } = useCategoriesQuery();
  const { data: productsData } = useProductsQuery();
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [sort, setSort] = useState<{ key: Sort; dir: 1 | -1 }>({ key: 'volumeShare', dir: -1 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductItem | null>(null);

  const cats: ICategoryItem[] = useMemo(() => ((data?.categories || []) as ICategoryItem[]).filter((c) => c.volume > 0), [data]);
  const products: ProductItem[] = useMemo(() => (productsData?.products || []) as ProductItem[], [productsData]);

  const prev = useRef(new Map<string, number>());
  const [flash, setFlash] = useState<Set<string>>(new Set());
  useEffect(() => {
    const changed = new Set<string>();
    cats.forEach((c) => {
      const p = prev.current.get(c.id);
      if (p != null && p !== c.volume) changed.add(c.id);
      prev.current.set(c.id, c.volume);
    });
    if (!changed.size) return;
    setFlash(changed);
    const t = setTimeout(() => setFlash(new Set()), 1600);
    return () => clearTimeout(t);
  }, [cats]);

  const q = search.trim().toLowerCase();
  const base = useMemo(() => cats.filter((c) => !q || c.name.toLowerCase().includes(q) || c.topBrands.some((b) => b.name.toLowerCase().includes(q))), [cats, q]);
  const inSegment = (c: ICategoryItem, s: Segment) =>
    s === 'drinks'
      ? !c.isFood
      : s === 'food'
        ? c.isFood
        : s === 'rising'
          ? (c.growth ?? 0) > 0
          : s === 'falling'
            ? (c.growth ?? 0) < 0
            : s === 'risk'
              ? (c.productsAtRisk ?? 0) > 0
              : s === 'open'
                ? c.leaderShare != null && c.leaderShare < 40
                : true;
  const counts = useMemo(() => Object.fromEntries(SEGMENTS.map((s) => [s.id, base.filter((c) => inSegment(c, s.id)).length])), [base]);
  const rows = useMemo(() => {
    const list = base.filter((c) => inSegment(c, segment));
    const v = (c: ICategoryItem): number | string => (sort.key === 'name' ? c.name.toLowerCase() : ((c as Record<string, unknown>)[sort.key] as number | null) ?? -999);
    return list.sort((a, b) => {
      const x = v(a);
      const y = v(b);
      return (typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number)) * sort.dir;
    });
  }, [base, segment, sort]);

  const kpi = useMemo(() => {
    const vol = cats.reduce((s, c) => s + c.volume, 0);
    const rev = cats.reduce((s, c) => s + c.revenue, 0);
    const food = cats.filter((c) => c.isFood).reduce((s, c) => s + c.revenue, 0);
    const top = [...cats].sort((a, b) => b.volume - a.volume)[0];
    const costed = cats.filter((c) => c.marginRate != null);
    const costedRev = costed.reduce((s, c) => s + c.revenue, 0);
    const margin = costedRev ? costed.reduce((s, c) => s + (c.marginRate as number) * c.revenue, 0) / costedRev : null;
    const fastest = [...cats].filter((c) => c.growth != null && c.volume > 0).sort((a, b) => (b.growth as number) - (a.growth as number))[0];
    return { count: cats.length, vol, rev, foodShare: rev ? (food / rev) * 100 : 0, top, margin, fastest };
  }, [cats]);

  const pie = useMemo(() => {
    const sorted = [...cats].sort((a, b) => b.volume - a.volume);
    const top = sorted.slice(0, 7).map((c) => ({ name: c.name, value: c.volumeShare, color: solid(c.color) }));
    const rest = sorted.slice(7).reduce((s, c) => s + c.volumeShare, 0);
    return rest > 0 ? [...top, { name: 'Autres', value: Math.round(rest * 10) / 10, color: '#64748b' }] : top;
  }, [cats]);

  const open = openId ? cats.find((c) => c.id === openId) || null : null;

  const exportCsv = () => {
    const cell = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = ['Catégorie', 'Type', 'Part du volume (%)', 'Volume', 'CA (F)', 'Évolution (%)', 'Présence (%)', 'Prix moyen (F)', 'Marge (%)', 'Produits en rupture', 'Marque n° 1', 'Part marque n° 1 (%)', 'Produits vendus'];
    const lines = rows.map((c) =>
      [c.name, c.isFood ? 'Nourriture' : 'Boisson', c.volumeShare, c.volume, Math.round(c.revenue), c.growth ?? '', c.posPenetration, c.avgSalePrice ?? '', c.marginRate ?? '', c.productsAtRisk ?? '', c.topBrands[0]?.name ?? '', c.leaderShare ?? '', c.activeProducts ?? '']
        .map(cell)
        .join(';'),
    );
    const blob = new Blob([`﻿${[head.map(cell).join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `emaquis-categories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const th = (key: Sort, label: string, help: string, align: 'left' | 'right' = 'right') => (
    <th className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <span className="inline-flex items-center">
        <button
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))}
          className={`inline-flex items-center gap-1 ${sort.key === key ? 'text-amber-400' : ''}`}
        >
          {label}
          <ArrowDownUp className="size-3 opacity-60" />
        </button>
        <InfoTip title={label} text={help} />
      </span>
    </th>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 pb-12">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${isConnected ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'}`}>
              <span className={`size-1.5 rounded-full ${isConnected ? 'animate-pulse bg-amber-400' : 'bg-muted-foreground'}`} />
              {isConnected ? 'En direct' : 'Reconnexion…'}
            </span>
            <span className="text-muted-foreground">
              {kpi.count} catégories actives · {data?.comparisonLabel || 'période choisie'}
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
            <Layers className="size-5 text-amber-500 md:size-6" />
            Catégories
          </h1>
          <p className="text-xs text-muted-foreground">Poids de chaque famille de produits, prix, marges, ruptures et marques dominantes, mis à jour en direct.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher</span>
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 60))}
              placeholder="Catégorie ou marque…"
              className="h-8 w-56 rounded-lg border border-border/70 bg-background/80 pl-8 pr-7 text-xs focus:border-amber-500/60 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Effacer">
                <X className="size-3.5" />
              </button>
            )}
          </label>
          <button onClick={exportCsv} className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 hover:bg-amber-400">
            <Download className="size-3.5" /> Exporter
          </button>
        </div>
      </motion.header>

      {/* Filtres globaux (période, pays, ville, statut…) : appliqués par le serveur */}
      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:col-span-8">
          <Kpi i={0} icon={<Crown className="size-4" />} label="Catégorie n° 1" help="Catégorie qui pèse le plus en volume sur la période." text={kpi.top?.name || '—'} sub={kpi.top ? `${kpi.top.volumeShare} % du volume` : ''} />
          <Kpi i={1} icon={<TrendingUp className="size-4" />} label="Plus forte progression" help="Catégorie dont les ventes augmentent le plus par rapport à la période précédente." text={kpi.fastest?.name || '—'} sub={kpi.fastest?.growth != null ? `${kpi.fastest.growth >= 0 ? '+' : ''}${kpi.fastest.growth.toFixed(1)} %` : 'pas de comparaison'} />
          <Kpi i={2} icon={<Layers className="size-4" />} label="Catégories actives" help="Nombre de catégories avec au moins une vente sur la période." value={kpi.count} format={int} sub={`${cats.filter((c) => (c.growth ?? 0) > 0).length} en progression`} />
          <Kpi i={3} icon={<Tag className="size-4" />} label="Chiffre d'affaires" help="Total encaissé par les établissements, toutes catégories confondues." value={kpi.rev} format={compact} sub="FCFA" />
          <Kpi i={4} icon={<UtensilsCrossed className="size-4" />} label="Part de la nourriture" help="Part du chiffre d'affaires réalisée par les plats et la nourriture (le reste : boissons)." value={kpi.foodShare} format={(n) => `${n.toFixed(1)} %`} sub="du chiffre d'affaires" />
          <Kpi i={5} icon={<Award className="size-4" />} label="Marge moyenne" help="Marge moyenne des établissements, pondérée par le chiffre d'affaires, sur les catégories au prix d'achat connu." value={kpi.margin ?? 0} format={(n) => (kpi.margin == null ? '—' : `${n.toFixed(1)} %`)} sub={kpi.margin == null ? 'aucun prix d’achat connu' : 'des établissements'} />
        </div>
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1, ease: EASE }} className="rounded-xl border border-border/80 bg-card/60 p-3 xl:col-span-4">
          <div className="flex items-center text-[11px] font-semibold">
            Poids des catégories
            <InfoTip title="Poids des catégories" text="Répartition du volume vendu entre les 7 premières catégories ; le reste est regroupé dans « Autres »." />
          </div>
          {pie.length ? (
            <div className="flex items-center gap-2">
              <ResponsiveContainer width="50%" height={170}>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2} stroke="none" animationDuration={600}>
                    {pie.map((p) => (
                      <Cell key={p.name} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} %`} contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-1">
                {pie.map((p) => (
                  <li key={p.name} className="flex items-center gap-1.5 text-[11px]">
                    <span className="size-2 shrink-0 rounded-sm" style={{ background: p.color }} />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto font-mono text-muted-foreground">{p.value} %</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="h-[170px] animate-pulse rounded-lg bg-muted" />
          )}
        </motion.section>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Segments">
        {SEGMENTS.map((s) => {
          const on = segment === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={on}
              title={s.hint}
              onClick={() => setSegment(s.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${on ? 'border-amber-500/60 bg-amber-500/15 font-semibold text-amber-400' : 'border-border/70 text-muted-foreground hover:text-foreground'}`}
            >
              {s.label}
              <span className={`rounded px-1 font-mono text-[10px] ${on ? 'bg-amber-500/20' : 'bg-muted'}`}>{counts[s.id] ?? 0}</span>
            </button>
          );
        })}
        <span className="ml-auto shrink-0 self-center text-xs text-muted-foreground">{rows.length} résultat{rows.length > 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
        <table className="w-full min-w-[1180px] text-xs">
          <thead className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              {th('name', 'Catégorie', HELP.name, 'left')}
              {th('volumeShare', 'Part du volume', HELP.volumeShare)}
              {th('revenue', 'CA', HELP.revenue)}
              {th('growth', 'Évolution', HELP.growth)}
              {th('posPenetration', 'Présence', HELP.posPenetration)}
              {th('avgSalePrice', 'Prix moyen', HELP.avgSalePrice)}
              {th('marginRate', 'Marge', HELP.marginRate)}
              {th('productsAtRisk', 'Ruptures', HELP.productsAtRisk)}
              {th('leaderShare', 'Marque n° 1', HELP.leaderShare, 'left')}
              <th className="px-3 py-2 text-right">
                <span className="inline-flex items-center">
                  Gamme
                  <InfoTip title="Gamme" text={HELP.range} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading && !rows.length
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={11} className="px-3 py-3">
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              : rows.map((c, i) => {
                  const leader = c.topBrands[0];
                  const color = solid(c.color);
                  return (
                    <tr key={c.id} onClick={() => setOpenId(c.id)} className={`cursor-pointer transition-colors duration-700 hover:bg-muted/40 ${flash.has(c.id) ? 'bg-amber-500/15' : ''}`}>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: `${color}26` }}>
                            {c.image ? <img src={c.image} alt="" className="size-full object-cover" /> : c.isFood ? <UtensilsCrossed className="size-4" style={{ color }} /> : <Wine className="size-4" style={{ color }} />}
                          </div>
                          <div className="min-w-0">
                            <div className="max-w-[200px] truncate font-semibold">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground">{c.isFood ? 'Nourriture' : 'Boisson'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono font-semibold">{c.volumeShare} %</div>
                        <div className="ml-auto mt-1 h-1 w-24 rounded-full bg-muted">
                          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, (c.volumeShare / Math.max(1, rows[0]?.volumeShare || 1)) * 100)}%`, background: color }} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-violet-400">{compact(c.revenue)}</td>
                      <td className="px-3 py-2 text-right">
                        <Growth value={c.growth} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono">{c.posPenetration} %</div>
                        <div className="text-[10px] text-muted-foreground">{int(c.activePosCount)} maquis</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-400">{F(c.avgSalePrice)}</td>
                      <td className="px-3 py-2 text-right font-mono">{c.marginRate == null ? '—' : `${c.marginRate} %`}</td>
                      <td className={`px-3 py-2 text-right font-mono ${(c.productsAtRisk ?? 0) > 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>{c.productsAtRisk ?? '—'}</td>
                      <td className="px-3 py-2">
                        {leader ? (
                          <span className="text-[11px]">
                            {leader.name}{' '}
                            <span className={`font-mono ${leader.share >= 60 ? 'text-rose-400' : leader.share < 40 ? 'text-emerald-400' : 'text-amber-400'}`}>{leader.share} %</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {c.activeProducts ?? '—'} / {c.productsCount}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!isLoading && !rows.length && <div className="py-12 text-center text-xs text-muted-foreground">Aucune catégorie pour ces filtres.</div>}
      </div>

      <CategoryDrawer category={open} products={products} onClose={() => setOpenId(null)} onOpenProduct={setProduct} />
      <ProductDrawer product={product} unit="cols" onClose={() => setProduct(null)} />
    </div>
  );
}

function CategoryDrawer({ category, products, onClose, onOpenProduct }: { category: ICategoryItem | null; products: ProductItem[]; onClose: () => void; onOpenProduct: (p: ProductItem) => void }) {
  const list = useMemo(
    () => (category ? products.filter((p) => p.volume > 0 && (p.categoryId === category.id || p.category === category.name)).sort((a, b) => b.volume - a.volume).slice(0, 30) : []),
    [category, products],
  );
  const color = solid(category?.color);
  return (
    <AnimatePresence>
      {category && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={category.name}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-y-0 right-0 z-40 w-full max-w-[520px] space-y-4 overflow-y-auto border-l border-border bg-background p-5 shadow-2xl"
          >
            <header className="flex items-start gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: `${color}26` }}>
                {category.image ? <img src={category.image} alt="" className="size-full object-cover" /> : category.isFood ? <UtensilsCrossed className="size-6" style={{ color }} /> : <Wine className="size-6" style={{ color }} />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight">{category.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {category.isFood ? 'Nourriture' : 'Boisson'} · {category.activeProducts ?? 0} produits vendus sur {category.productsCount}
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fermer">
                <X className="size-4" />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Mini label="Part du volume" value={`${category.volumeShare} %`} />
              <Mini label="CA" value={F(category.revenue)} />
              <Mini label="Évolution" value={category.growth == null ? '—' : `${category.growth >= 0 ? '+' : ''}${category.growth} %`} tone={category.growth == null ? undefined : category.growth >= 0 ? 'up' : 'down'} />
              <Mini label="Présence" value={`${category.posPenetration} %`} hint={`${int(category.activePosCount)} maquis`} />
              <Mini label="Prix moyen" value={F(category.avgSalePrice)} />
              <Mini label="Marge" value={category.marginRate == null ? '—' : `${category.marginRate} %`} hint={category.marginCoverage ? `sur ${category.marginCoverage} % du volume` : undefined} />
            </div>

            <section className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Award className="size-4 text-amber-500" /> Marques de la catégorie
                <InfoTip title="Part dans la catégorie" text="Part de chaque marque dans le volume vendu de la catégorie. Une marque au-dessus de 60 % domine ; sous 40 % le marché reste ouvert." />
              </h3>
              <ul className="mt-2 space-y-1.5">
                {category.topBrands.map((b) => (
                  <li key={b.name} className="text-[11px]">
                    <div className="flex justify-between">
                      <span>{b.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {compact(b.volume)} · <b className="text-amber-400">{b.share} %</b>
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, b.share)}%`, background: color }} />
                    </div>
                  </li>
                ))}
                {!category.topBrands.length && <li className="text-[11px] text-muted-foreground">Aucune marque identifiée.</li>}
              </ul>
            </section>

            <section className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="size-4 text-amber-500" /> Produits de la catégorie
              </h3>
              <ul className="mt-2 divide-y divide-border/50">
                {list.map((p) => {
                  const img = resolveProductImage(p.image ?? null, p.name, p.brand);
                  return (
                    <li key={p.id}>
                      <button onClick={() => onOpenProduct(p)} className="flex w-full items-center gap-2.5 py-2 text-left hover:bg-muted/40">
                        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {img ? <img src={img} alt="" loading="lazy" className="size-full object-contain" /> : <Package className="size-3.5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.brand} · {compact(p.volume)} vendus · {F(p.pricing?.avgSalePrice)}
                          </div>
                        </div>
                        {p.stockoutRisk === 'HIGH' && (
                          <span className="flex items-center gap-0.5 rounded border border-rose-500/30 bg-rose-500/15 px-1 text-[9px] font-semibold text-rose-400">
                            <ShieldAlert className="size-2.5" /> Rupture
                          </span>
                        )}
                        <Growth value={p.growth} />
                      </button>
                    </li>
                  );
                })}
                {!list.length && <li className="py-2 text-[11px] text-muted-foreground">Aucun produit vendu sur la période.</li>}
              </ul>
            </section>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Growth({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 whitespace-nowrap font-mono text-[11px] font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? '+' : ''}
      {value.toFixed(1)} %
    </span>
  );
}

function Mini({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`truncate font-mono text-sm font-semibold ${tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : ''}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Kpi({ i, icon, label, help, value, format, text, sub }: { i: number; icon: React.ReactNode; label: string; help: string; value?: number; format?: (n: number) => string; text?: string; sub: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }} className="rounded-xl border border-border/80 bg-card/60 p-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center">
          {label}
          <InfoTip title={label} text={help} />
        </span>
        <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">{icon}</span>
      </div>
      <div className="mt-1 truncate text-lg font-extrabold">{text != null ? text : value != null && format ? <AnimatedNumber value={value} format={format} fromZero /> : '—'}</div>
      <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
    </motion.div>
  );
}
