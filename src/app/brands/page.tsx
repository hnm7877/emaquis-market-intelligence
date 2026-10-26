'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowDownUp, Award, Crown, Download, Layers, MapPin, Package, Search, ShieldAlert, Tag, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useBrandsQuery, useProductsQuery } from '@/hooks/market/useMarketQueries';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import type { BrandRow, ProductItem } from '@/lib/validations/market.schemas';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { InfoTip } from '@/components/ui/InfoTip';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { ProductDrawer } from '@/components/products/ProductDrawer';
import { resolveProductImage } from '@/utils/productImages';

const EASE = [0.23, 1, 0.32, 1] as const;
const COLORS = ['#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16', '#ec4899', '#64748b'];
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const compact = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.abs(n) >= 10_000 ? `${(n / 1000).toFixed(1)} k` : int(n));
const F = (n: number | null | undefined) => (n == null ? '—' : `${int(n)} F`);

type Sort = 'marketShare' | 'revenue' | 'growth' | 'penetrationRate' | 'avgSalePrice' | 'marginRate' | 'productsAtRisk' | 'name';
type Segment = 'all' | 'rising' | 'falling' | 'risk' | 'margin';

const SEGMENTS: { id: Segment; label: string; hint: string }[] = [
  { id: 'all', label: 'Toutes', hint: 'Toutes les marques avec des ventes' },
  { id: 'rising', label: 'En progression', hint: 'Ventes en hausse vs période précédente' },
  { id: 'falling', label: 'En recul', hint: 'Ventes en baisse vs période précédente' },
  { id: 'risk', label: 'Produits en rupture', hint: 'Au moins un produit avec un risque de rupture élevé' },
  { id: 'margin', label: 'Fortes marges', hint: 'Marge des établissements ≥ 35 %' },
];

const HELP = {
  name: 'Nom de la marque ou du groupe (brasserie, distributeur). Cliquez sur une ligne pour ouvrir sa fiche.',
  marketShare: 'Part de la marque dans tout ce qui a été vendu sur la période (en volume), pour les filtres choisis.',
  revenue: "Chiffre d'affaires : total encaissé par les établissements pour les produits de la marque, en francs CFA.",
  growth: 'Variation des ventes de la marque par rapport à la période précédente de même durée.',
  penetrationRate: 'Part des maquis actifs qui ont vendu au moins un produit de la marque sur la période.',
  avgSalePrice: 'Prix moyen réellement payé pour une unité de la marque (tous ses produits confondus).',
  marginRate: "Marge moyenne des établissements sur les produits de la marque, pondérée par les quantités vendues (produits au prix d'achat connu).",
  productsAtRisk: 'Nombre de produits de la marque dont le risque de rupture est élevé (stock réel des établissements).',
  fief: 'Commune où la marque vend le plus, avec sa part locale : part de la marque dans tout ce qui se vend dans cette commune.',
  range: 'Produits de la marque vendus sur la période / produits au catalogue.',
};

/**
 * Marques : données par WebSocket (React Query, contrôle Zod). Recherche, segments et tri
 * dans le navigateur, aucune requête. Fiche marque avec ses produits (vue Produits partagée).
 */
export default function BrandsPage() {
  const { filters, setFilter, resetFilters } = useMarketFilterStore();
  const { data, isLoading } = useBrandsQuery();
  const { data: productsData } = useProductsQuery();
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [sort, setSort] = useState<{ key: Sort; dir: 1 | -1 }>({ key: 'marketShare', dir: -1 });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductItem | null>(null);

  const brands: BrandRow[] = useMemo(() => ((data?.brands || []) as BrandRow[]).filter((b) => b.volume > 0), [data]);
  const products: ProductItem[] = useMemo(() => (productsData?.products || []) as ProductItem[], [productsData]);

  // Lignes mises à jour en direct : bref surlignage
  const prev = useRef(new Map<string, number>());
  const [flash, setFlash] = useState<Set<string>>(new Set());
  useEffect(() => {
    const changed = new Set<string>();
    brands.forEach((b) => {
      const p = prev.current.get(b.id);
      if (p != null && p !== b.volume) changed.add(b.id);
      prev.current.set(b.id, b.volume);
    });
    if (!changed.size) return;
    setFlash(changed);
    const t = setTimeout(() => setFlash(new Set()), 1600);
    return () => clearTimeout(t);
  }, [brands]);

  const q = search.trim().toLowerCase();
  const base = useMemo(
    () => brands.filter((b) => !q || b.name.toLowerCase().includes(q) || (b.topCategory || '').toLowerCase().includes(q) || (b.fiefTerritorial || '').toLowerCase().includes(q)),
    [brands, q],
  );
  const inSegment = (b: BrandRow, s: Segment) =>
    s === 'rising' ? (b.growth ?? 0) > 0 : s === 'falling' ? (b.growth ?? 0) < 0 : s === 'risk' ? (b.productsAtRisk ?? 0) > 0 : s === 'margin' ? (b.marginRate ?? -1) >= 35 : true;
  const counts = useMemo(() => Object.fromEntries(SEGMENTS.map((s) => [s.id, base.filter((b) => inSegment(b, s.id)).length])), [base]);
  const rows = useMemo(() => {
    const list = base.filter((b) => inSegment(b, segment));
    const v = (b: BrandRow): number | string => (sort.key === 'name' ? b.name.toLowerCase() : ((b as Record<string, unknown>)[sort.key] as number | null) ?? -999);
    return list.sort((a, b) => {
      const x = v(a);
      const y = v(b);
      return (typeof x === 'string' ? x.localeCompare(String(y)) : (x as number) - (y as number)) * sort.dir;
    });
  }, [base, segment, sort]);

  const kpi = useMemo(() => {
    const vol = brands.reduce((s, b) => s + b.volume, 0);
    const rev = brands.reduce((s, b) => s + b.revenue, 0);
    const sorted = [...brands].sort((a, b) => b.volume - a.volume);
    const top3 = sorted.slice(0, 3).reduce((s, b) => s + b.marketShare, 0);
    // Indice de concentration (Herfindahl) : 10 000 = monopole
    const hhi = brands.reduce((s, b) => s + b.marketShare ** 2, 0);
    return { count: brands.length, vol, rev, leader: sorted[0], top3, hhi, rising: brands.filter((b) => (b.growth ?? 0) > 0).length };
  }, [brands]);

  const pie = useMemo(() => {
    const sorted = [...brands].sort((a, b) => b.volume - a.volume);
    const top = sorted.slice(0, 7).map((b, i) => ({ name: b.name, value: b.marketShare, color: COLORS[i] }));
    const rest = sorted.slice(7).reduce((s, b) => s + b.marketShare, 0);
    return rest > 0 ? [...top, { name: 'Autres marques', value: Math.round(rest * 10) / 10, color: COLORS[7] }] : top;
  }, [brands]);

  const open = openKey ? brands.find((b) => b.id === openKey) || null : null;

  const exportCsv = () => {
    const cell = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = ['Marque', 'Part de marché (%)', 'Volume', 'CA (F)', 'Évolution (%)', 'Pénétration (%)', 'Maquis', 'Prix moyen (F)', 'Marge (%)', 'Produits en rupture', 'Fief', 'Catégorie principale', 'Produits vendus'];
    const lines = rows.map((b) =>
      [b.name, b.marketShare, b.volume, Math.round(b.revenue), b.growth ?? '', b.penetrationRate, b.activePosCount, b.avgSalePrice ?? '', b.marginRate ?? '', b.productsAtRisk ?? '', b.fiefTerritorial ?? '', b.topCategory ?? '', b.activeProducts ?? '']
        .map(cell)
        .join(';'),
    );
    const blob = new Blob([`﻿${[head.map(cell).join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `emaquis-marques-${new Date().toISOString().slice(0, 10)}.csv`;
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
              {kpi.count} marques actives · {data?.comparisonLabel || 'période choisie'}
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
            <Award className="size-5 text-amber-500 md:size-6" />
            Marques & brasseries
          </h1>
          <p className="text-xs text-muted-foreground">Parts de marché, présence dans les maquis, prix, marges et ruptures par marque, mis à jour en direct.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher</span>
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 60))}
              placeholder="Marque, catégorie, commune…"
              className="h-8 w-60 rounded-lg border border-border/70 bg-background/80 pl-8 pr-7 text-xs focus:border-amber-500/60 focus:outline-none"
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

      {/* Filtres globaux (période, pays, ville, statut…) : appliqués par le serveur, données poussées par WebSocket */}
      <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} />

      {/* Indicateurs + répartition */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:col-span-8">
          <Kpi i={0} icon={<Crown className="size-4" />} label="Marque n° 1" help="Marque qui vend le plus en volume sur la période." text={kpi.leader?.name || '—'} sub={kpi.leader ? `${kpi.leader.marketShare} % du marché` : ''} />
          <Kpi i={1} icon={<Layers className="size-4" />} label="Poids des 3 premières" help="Part du marché détenue par les trois plus grosses marques. Plus elle est haute, plus le marché est concentré." value={kpi.top3} format={(n) => `${n.toFixed(1)} %`} sub={`Concentration : ${kpi.hhi >= 2500 ? 'forte' : kpi.hhi >= 1500 ? 'moyenne' : 'faible'}`} />
          <Kpi i={2} icon={<Award className="size-4" />} label="Marques actives" help="Nombre de marques avec au moins une vente sur la période." value={kpi.count} format={int} sub={`${kpi.rising} en progression`} />
          <Kpi i={3} icon={<Package className="size-4" />} label="Volume total" help="Total vendu toutes marques confondues sur la période (unités)." value={kpi.vol} format={compact} sub="unités" />
          <Kpi i={4} icon={<Tag className="size-4" />} label="Chiffre d'affaires" help="Total encaissé par les établissements, toutes marques confondues." value={kpi.rev} format={compact} sub="FCFA" />
          <Kpi i={5} icon={<ShieldAlert className="size-4" />} label="Marques avec rupture" help="Marques dont au moins un produit a un risque de rupture élevé." value={brands.filter((b) => (b.productsAtRisk ?? 0) > 0).length} format={int} sub="d'après le stock réel" tone="rose" />
        </div>
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1, ease: EASE }} className="rounded-xl border border-border/80 bg-card/60 p-3 xl:col-span-4">
          <div className="flex items-center text-[11px] font-semibold">
            Parts de marché
            <InfoTip title="Parts de marché" text="Répartition du volume vendu entre les 7 premières marques ; le reste est regroupé dans « Autres marques »." />
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

      {/* Segments */}
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

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
        <table className="w-full min-w-[1180px] text-xs">
          <thead className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              {th('name', 'Marque', HELP.name, 'left')}
              {th('marketShare', 'Part de marché', HELP.marketShare)}
              {th('revenue', 'CA', HELP.revenue)}
              {th('growth', 'Évolution', HELP.growth)}
              {th('penetrationRate', 'Présence', HELP.penetrationRate)}
              {th('avgSalePrice', 'Prix moyen', HELP.avgSalePrice)}
              {th('marginRate', 'Marge', HELP.marginRate)}
              {th('productsAtRisk', 'Ruptures', HELP.productsAtRisk)}
              <th className="px-3 py-2 text-left">
                <span className="inline-flex items-center">
                  Fief
                  <InfoTip title="Fief" text={HELP.fief} />
                </span>
              </th>
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
              : rows.map((b, i) => {
                  const fief = b.localShares?.[0];
                  return (
                    <tr key={b.id} onClick={() => setOpenKey(b.id)} className={`cursor-pointer transition-colors duration-700 hover:bg-muted/40 ${flash.has(b.id) ? 'bg-amber-500/15' : ''}`}>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/90">
                            {b.logo ? <img src={b.logo} alt="" className="size-full object-contain p-0.5" /> : <span className="text-[11px] font-bold text-slate-700">{b.name.slice(0, 2).toUpperCase()}</span>}
                          </div>
                          <div className="min-w-0">
                            <div className="max-w-[200px] truncate font-semibold">{b.name}</div>
                            <div className="text-[10px] text-muted-foreground">{b.topCategory || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono font-semibold">{b.marketShare} %</div>
                        <div className="ml-auto mt-1 h-1 w-24 rounded-full bg-muted">
                          <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700" style={{ width: `${Math.min(100, b.marketShare * (100 / Math.max(1, rows[0]?.marketShare || 1)))}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-violet-400">{compact(b.revenue)}</td>
                      <td className="px-3 py-2 text-right">
                        <Growth value={b.growth} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="font-mono">{b.penetrationRate} %</div>
                        <div className="text-[10px] text-muted-foreground">{int(b.activePosCount)} maquis</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-400">{F(b.avgSalePrice)}</td>
                      <td className="px-3 py-2 text-right font-mono">{b.marginRate == null ? '—' : `${b.marginRate} %`}</td>
                      <td className={`px-3 py-2 text-right font-mono ${(b.productsAtRisk ?? 0) > 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>{b.productsAtRisk ?? '—'}</td>
                      <td className="px-3 py-2">
                        {fief ? (
                          <span className="text-[11px]">
                            {fief.commune} <span className="font-mono text-amber-400">{fief.localShare} %</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {b.activeProducts ?? '—'} / {b.productCount}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!isLoading && !rows.length && <div className="py-12 text-center text-xs text-muted-foreground">Aucune marque pour ces filtres.</div>}
      </div>

      <BrandDrawer brand={open} products={products} onClose={() => setOpenKey(null)} onOpenProduct={setProduct} />
      <ProductDrawer product={product} unit="cols" onClose={() => setProduct(null)} />
    </div>
  );
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function BrandDrawer({ brand, products, onClose, onOpenProduct }: { brand: BrandRow | null; products: ProductItem[]; onClose: () => void; onOpenProduct: (p: ProductItem) => void }) {
  // Produits de la marque : même marque (nom normalisé) ou produits phares remontés par l'API
  const list = useMemo(() => {
    if (!brand) return [];
    const k = norm(brand.name);
    const top = new Set(brand.topProducts.map((t) => norm(t.name)));
    return products
      .filter((p) => p.volume > 0 && (norm(p.brand) === k || norm(p.brand).includes(k) || k.includes(norm(p.brand)) || top.has(norm(p.name))))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 30);
  }, [brand, products]);

  return (
    <AnimatePresence>
      {brand && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={brand.name}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-y-0 right-0 z-40 w-full max-w-[520px] space-y-4 overflow-y-auto border-l border-border bg-background p-5 shadow-2xl"
          >
            <header className="flex items-start gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/90">
                {brand.logo ? <img src={brand.logo} alt="" className="size-full object-contain p-1" /> : <span className="text-lg font-bold text-slate-700">{brand.name.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight">{brand.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {brand.topCategory || '—'} · {brand.activeProducts ?? 0} produits vendus sur {brand.productCount}
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fermer">
                <X className="size-4" />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Mini label="Part de marché" value={`${brand.marketShare} %`} />
              <Mini label="CA" value={F(brand.revenue)} />
              <Mini label="Évolution" value={brand.growth == null ? '—' : `${brand.growth >= 0 ? '+' : ''}${brand.growth} %`} tone={brand.growth == null ? undefined : brand.growth >= 0 ? 'up' : 'down'} />
              <Mini label="Présence" value={`${brand.penetrationRate} %`} hint={`${int(brand.activePosCount)} / ${int(brand.totalPosCount)} maquis`} />
              <Mini label="Prix moyen" value={F(brand.avgSalePrice)} />
              <Mini label="Marge" value={brand.marginRate == null ? '—' : `${brand.marginRate} %`} hint={brand.marginCoverage ? `sur ${brand.marginCoverage} % du volume` : undefined} />
            </div>

            <section className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="size-4 text-rose-500" /> Communes clés
                <InfoTip title="Part locale" text="Part de la marque dans tout ce qui se vend dans la commune. Au-dessus de 50 %, la marque domine localement." />
              </h3>
              <ul className="mt-2 space-y-1.5">
                {brand.localShares.map((c) => (
                  <li key={c.commune} className="text-[11px]">
                    <div className="flex justify-between">
                      <span>{c.commune}</span>
                      <span className="font-mono text-muted-foreground">
                        {compact(c.volume)} · <b className="text-amber-400">{c.localShare} %</b>
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700" style={{ width: `${Math.min(100, c.localShare)}%` }} />
                    </div>
                  </li>
                ))}
                {!brand.localShares.length && <li className="text-[11px] text-muted-foreground">Aucune vente localisée.</li>}
              </ul>
            </section>

            <section className="rounded-xl border border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="size-4 text-amber-500" /> Produits de la marque
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
                            {compact(p.volume)} vendus · {F(p.pricing?.avgSalePrice)} · marge {p.pricing?.marginRate == null ? '—' : `${p.pricing.marginRate} %`}
                          </div>
                        </div>
                        {p.stockoutRisk === 'HIGH' && <span className="rounded border border-rose-500/30 bg-rose-500/15 px-1 text-[9px] font-semibold text-rose-400">Rupture</span>}
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

function Kpi({
  i,
  icon,
  label,
  help,
  value,
  format,
  text,
  sub,
  tone = 'amber',
}: {
  i: number;
  icon: React.ReactNode;
  label: string;
  help: string;
  value?: number;
  format?: (n: number) => string;
  text?: string;
  sub: string;
  tone?: 'amber' | 'rose';
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }} className="rounded-xl border border-border/80 bg-card/60 p-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center">
          {label}
          <InfoTip title={label} text={help} />
        </span>
        <span className={`rounded-lg p-1.5 ${tone === 'rose' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{icon}</span>
      </div>
      <div className="mt-1 truncate text-lg font-extrabold">{text != null ? text : value != null && format ? <AnimatedNumber value={value} format={format} fromZero /> : '—'}</div>
      <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
    </motion.div>
  );
}
