'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownUp,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  Package,
  Percent,
  Rows3,
  Search,
  ShieldAlert,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useProductsQuery } from '@/hooks/market/useMarketQueries';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { useProductsUiStore, type ProductSegment, type ProductSort } from '@/stores/useProductsUiStore';
import type { ProductItem } from '@/lib/validations/market.schemas';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PriceLadder } from '@/components/products/PriceLadder';
import { ProductDrawer, RISK_META } from '@/components/products/ProductDrawer';
import { resolveProductImage } from '@/utils/productImages';
import { DISPLAY_VOLUME_UNITS, formatProductVolume } from '@/utils/productVolumeConverter';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
const money = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : int(n));
const F = (n: number | null | undefined) => (n == null ? '—' : `${int(n)} F`);
const RISK_ORDER: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

const SEGMENTS: { id: ProductSegment; label: string; hint: string }[] = [
  { id: 'all', label: 'Tous', hint: 'Tous les produits' },
  { id: 'risk', label: 'Risque de rupture', hint: 'Risque élevé ou modéré (stock réel des établissements)' },
  { id: 'rising', label: 'En progression', hint: 'Ventes en hausse vs période précédente' },
  { id: 'falling', label: 'En recul', hint: 'Ventes en baisse vs période précédente' },
  { id: 'margin', label: 'Fortes marges', hint: 'Marge des établissements ≥ 35 %' },
  { id: 'spread', label: 'Prix dispersés', hint: 'La moitié des établissements a un écart de prix ≥ 20 %' },
  { id: 'unsold', label: 'Sans ventes', hint: 'Au catalogue mais aucune vente sur la période' },
];

const spreadOf = (p: ProductItem) => {
  const s = p.pricing?.shelfPrice;
  return s && s.count >= 3 ? s.p75 / Math.max(1, s.p25) : null;
};

function matchesSegment(p: ProductItem, seg: ProductSegment) {
  switch (seg) {
    case 'risk':
      return p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'MEDIUM';
    case 'rising':
      return p.volume > 0 && (p.growth ?? 0) > 0;
    case 'falling':
      return p.volume > 0 && (p.growth ?? 0) < 0;
    case 'margin':
      return (p.pricing?.marginRate ?? -1) >= 35;
    case 'spread':
      return (spreadOf(p) ?? 0) >= 1.2;
    case 'unsold':
      return p.volume === 0;
    default:
      return true;
  }
}

const sortValue = (p: ProductItem, key: ProductSort): number | string => {
  switch (key) {
    case 'revenue':
      return p.revenue ?? 0;
    case 'avgPrice':
      return p.pricing?.avgSalePrice ?? -1;
    case 'margin':
      return p.pricing?.marginRate ?? -999;
    case 'rotation':
      return p.rotationRate;
    case 'cover':
      return p.stock?.medianDaysCover ?? 9999;
    case 'risk':
      return (RISK_ORDER[p.stockoutRisk] ?? 0) * 1e9 + p.volume;
    case 'growth':
      return p.growth ?? -999;
    case 'name':
      return p.name.toLowerCase();
    default:
      return p.volume;
  }
};

/**
 * Produits : données reçues par WebSocket (React Query garde le cache, Zod les contrôle).
 * Recherche, segments, tri et pagination s'appliquent dans le navigateur : aucune requête.
 */
export default function ProductsPage() {
  const ui = useProductsUiStore();
  useEffect(() => {
    void useProductsUiStore.persist.rehydrate();
  }, []);
  const { data, isLoading } = useProductsQuery();
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ProductItem | null>(null);

  const products: ProductItem[] = useMemo(() => (data?.products || []) as ProductItem[], [data]);

  // Lignes mises à jour par le direct : bref surlignage
  const prevVolumes = useRef(new Map<string, number>());
  const [flash, setFlash] = useState<Set<string>>(new Set());
  useEffect(() => {
    const changed = new Set<string>();
    for (const p of products) {
      const prev = prevVolumes.current.get(p.id);
      if (prev != null && prev !== p.volume) changed.add(p.id);
      prevVolumes.current.set(p.id, p.volume);
    }
    if (!changed.size) return;
    setFlash(changed);
    const t = setTimeout(() => setFlash(new Set()), 1600);
    return () => clearTimeout(t);
  }, [products]);

  // Garder la fiche ouverte à jour avec les chiffres poussés
  const selectedLive = selected ? products.find((p) => p.id === selected.id) || selected : null;

  const categories = useMemo(() => [...new Set(products.filter((p) => p.volume > 0).map((p) => p.category))].sort(), [products]);
  const brands = useMemo(
    () => [...new Set(products.filter((p) => p.volume > 0 && (ui.category === 'all' || p.category === ui.category)).map((p) => p.brand))].sort(),
    [products, ui.category],
  );

  const q = ui.search.trim().toLowerCase();
  const base = useMemo(
    () =>
      products.filter(
        (p) =>
          (ui.category === 'all' || p.category === ui.category) &&
          (ui.brand === 'all' || p.brand === ui.brand) &&
          (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)),
      ),
    [products, ui.category, ui.brand, q],
  );
  const segmentCounts = useMemo(() => Object.fromEntries(SEGMENTS.map((s) => [s.id, base.filter((p) => matchesSegment(p, s.id)).length])), [base]);
  const filtered = useMemo(() => {
    const list = base.filter((p) => matchesSegment(p, ui.segment));
    return list.sort((a, b) => {
      const va = sortValue(a, ui.sort);
      const vb = sortValue(b, ui.sort);
      return (typeof va === 'string' ? va.localeCompare(String(vb)) : (va as number) - (vb as number)) * ui.dir;
    });
  }, [base, ui.segment, ui.sort, ui.dir]);

  const pages = Math.max(1, Math.ceil(filtered.length / ui.pageSize));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * ui.pageSize, current * ui.pageSize);

  // Indicateurs de la sélection (pondérés par les volumes réels)
  const kpi = useMemo(() => {
    const sold = filtered.filter((p) => p.volume > 0);
    const volume = sold.reduce((s, p) => s + p.volume, 0);
    const revenue = sold.reduce((s, p) => s + (p.revenue || 0), 0);
    const withCost = sold.filter((p) => p.pricing?.unitCost != null && p.pricing?.avgSalePrice != null);
    const costVol = withCost.reduce((s, p) => s + p.volume, 0);
    const marginSum = withCost.reduce((s, p) => s + (p.pricing!.unitMargin || 0) * p.volume, 0);
    const revWithCost = withCost.reduce((s, p) => s + (p.pricing!.avgSalePrice || 0) * p.volume, 0);
    return {
      volume,
      revenue,
      avgPrice: volume ? revenue / volume : 0,
      marginRate: revWithCost ? (marginSum / revWithCost) * 100 : null,
      marginCoverage: volume ? costVol / volume : 0,
      atRisk: sold.filter((p) => p.stockoutRisk === 'HIGH').length,
      tracked: sold.filter((p) => p.stockoutRisk !== 'UNKNOWN').length,
      active: sold.length,
    };
  }, [filtered]);

  const setSort = (key: ProductSort) => ui.set({ sort: key, dir: ui.sort === key ? (ui.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 });

  const exportCsv = () => {
    const cell = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = [
      'Produit', 'Marque', 'Catégorie', 'Format', 'Volume', 'CA (F)', 'Prix moyen encaissé (F)', 'Prix affiché min', 'Prix affiché médian', 'Prix affiché max',
      'Coût bouteille (F)', 'Prix casier (F)', 'Prix carton (F)', 'Marge (%)', 'Rotation /sem/maquis', 'Couverture (j)', 'Risque rupture', 'Réassort (j)', 'Évolution (%)', 'Top communes',
    ];
    const lines = filtered.map((p) => {
      const c = (t: string) => p.pricing?.containers?.find((x) => x.type === t)?.avgPrice ?? '';
      return [
        p.name, p.brand, p.category, p.format, p.volume, Math.round(p.revenue || 0), p.pricing?.avgSalePrice ?? '', p.pricing?.shelfPrice?.min ?? '', p.pricing?.shelfPrice?.median ?? '',
        p.pricing?.shelfPrice?.max ?? '', p.pricing?.unitCost ?? '', c('casier'), c('carton'), p.pricing?.marginRate ?? '', p.rotationRate, p.stock?.medianDaysCover ?? '',
        RISK_META[p.stockoutRisk]?.label ?? p.stockoutRisk, p.reorderFrequencyDays ?? '', p.growth ?? '', p.topCommunes.join(' / '),
      ]
        .map(cell)
        .join(';');
    });
    const blob = new Blob([`﻿${[head.map(cell).join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `emaquis-produits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const th = (key: ProductSort, label: string, align: 'left' | 'right' = 'right') => (
    <th className={`px-3 py-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button onClick={() => setSort(key)} className={`inline-flex items-center gap-1 ${ui.sort === key ? 'text-amber-400' : ''}`}>
        {label}
        <ArrowDownUp className="size-3 opacity-60" />
      </button>
    </th>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 pb-12">
      {/* En-tête */}
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${isConnected ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'}`}>
              <span className={`size-1.5 rounded-full ${isConnected ? 'animate-pulse bg-amber-400' : 'bg-muted-foreground'}`} />
              {isConnected ? 'En direct' : 'Reconnexion…'}
            </span>
            <span className="text-muted-foreground">
              {int(kpi.active)} produits vendus · {data?.comparisonLabel || 'période choisie'}
              {data?.analysisSpanDays ? ` · ${data.analysisSpanDays} j analysés` : ''}
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
            <Package className="size-5 text-amber-500 md:size-6" />
            Produits & prix du marché
          </h1>
          <p className="text-xs text-muted-foreground">Volumes, prix réellement pratiqués, prix d&apos;achat casier / carton, marges et risques de rupture calculés sur le stock réel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher</span>
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={ui.search}
              onChange={(e) => {
                ui.set({ search: e.target.value });
                setPage(1);
              }}
              placeholder="Produit, marque, catégorie…"
              className="h-8 w-60 rounded-lg border border-border/70 bg-background/80 pl-8 pr-7 text-xs focus:border-amber-500/60 focus:outline-none"
            />
            {ui.search && (
              <button onClick={() => ui.set({ search: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Effacer">
                <X className="size-3.5" />
              </button>
            )}
          </label>
          <div className="flex h-8 items-center rounded-lg border border-border/70 bg-muted/40 p-0.5" role="radiogroup" aria-label="Unité">
            {DISPLAY_VOLUME_UNITS.map((u) => (
              <button
                key={u.id}
                role="radio"
                aria-checked={ui.unit === u.id}
                onClick={() => ui.set({ unit: u.id })}
                title={u.description}
                className={`relative h-full rounded-md px-2.5 text-xs transition-colors ${ui.unit === u.id ? 'font-semibold text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {ui.unit === u.id && <motion.span layoutId="prod-unit" className="absolute inset-0 rounded-md bg-amber-500" transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }} />}
                <span className="relative">{u.shortLabel}</span>
              </button>
            ))}
          </div>
          <div className="flex h-8 items-center rounded-lg border border-border/70 p-0.5">
            <button onClick={() => ui.set({ view: 'table' })} className={`rounded-md p-1.5 ${ui.view === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`} aria-label="Tableau">
              <Rows3 className="size-3.5" />
            </button>
            <button onClick={() => ui.set({ view: 'grid' })} className={`rounded-md p-1.5 ${ui.view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`} aria-label="Grille">
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
          <button onClick={exportCsv} className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 hover:bg-amber-400">
            <Download className="size-3.5" /> Exporter
          </button>
        </div>
      </motion.header>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi i={0} icon={<Boxes className="size-4" />} label="Volume vendu" value={kpi.volume} format={(n) => formatProductVolume(n, ui.unit, 'Total').formatted} sub={`${int(kpi.active)} produits`} loading={isLoading} />
        <Kpi i={1} icon={<Wallet className="size-4" />} label="Chiffre d'affaires" value={kpi.revenue} format={money} sub="FCFA" loading={isLoading} />
        <Kpi i={2} icon={<Tag className="size-4" />} label="Prix moyen encaissé" value={kpi.avgPrice} format={(n) => `${int(n)} F`} sub="par unité vendue" loading={isLoading} />
        <Kpi
          i={3}
          icon={<Percent className="size-4" />}
          label="Marge des établissements"
          value={kpi.marginRate ?? 0}
          format={(n) => (kpi.marginRate == null ? '—' : `${n.toFixed(1)} %`)}
          sub={kpi.marginRate == null ? 'aucun prix d’achat connu' : `sur ${Math.round(kpi.marginCoverage * 100)} % du volume`}
          loading={isLoading}
        />
        <Kpi i={4} icon={<ShieldAlert className="size-4" />} label="Risque de rupture élevé" value={kpi.atRisk} format={int} sub={`${int(kpi.tracked)} produits suivis en stock`} loading={isLoading} tone="rose" />
        <Kpi
          i={5}
          icon={<TrendingUp className="size-4" />}
          label="En progression"
          value={filtered.filter((p) => p.volume > 0 && (p.growth ?? 0) > 0).length}
          format={int}
          sub={`${filtered.filter((p) => p.volume > 0 && (p.growth ?? 0) < 0).length} en recul`}
          loading={isLoading}
          tone="emerald"
        />
      </div>

      {/* Filtres */}
      <div className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Segments">
          {SEGMENTS.map((s) => {
            const on = ui.segment === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={on}
                title={s.hint}
                onClick={() => {
                  ui.set({ segment: s.id });
                  setPage(1);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                  on ? 'border-amber-500/60 bg-amber-500/15 font-semibold text-amber-400' : 'border-border/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
                <span className={`rounded px-1 font-mono text-[10px] ${on ? 'bg-amber-500/20' : 'bg-muted'}`}>{segmentCounts[s.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Select label="Catégorie" value={ui.category} options={categories} onChange={(v) => { ui.set({ category: v, brand: 'all' }); setPage(1); }} />
          <Select label="Marque" value={ui.brand} options={brands} onChange={(v) => { ui.set({ brand: v }); setPage(1); }} />
          {(ui.category !== 'all' || ui.brand !== 'all' || ui.segment !== 'all' || ui.search) && (
            <button onClick={() => { ui.reset(); setPage(1); }} className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground">
              <X className="size-3" /> Réinitialiser
            </button>
          )}
          <span className="ml-auto text-muted-foreground">{int(filtered.length)} résultat{filtered.length > 1 ? 's' : ''}</span>
        </div>
        {data && data.stockDataAvailable === false && (
          <p className="text-[11px] text-amber-400">Stock des établissements pas encore synchronisé : le risque de rupture apparaît comme « Stock inconnu » (lancer l&apos;import initial depuis Paramètres).</p>
        )}
      </div>

      {/* Liste */}
      {ui.view === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
          <table className="w-full min-w-[1280px] text-xs">
            <thead className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                {th('name', 'Produit', 'left')}
                {th('volume', 'Volume')}
                {th('revenue', 'CA')}
                {th('avgPrice', 'Prix moyen')}
                <th className="w-40 px-3 py-2 text-left">Prix affichés</th>
                <th className="px-3 py-2 text-right">Achat</th>
                {th('margin', 'Marge')}
                {th('rotation', 'Rotation')}
                {th('cover', 'Couverture')}
                {th('risk', 'Rupture')}
                <th className="px-3 py-2 text-right">Réassort</th>
                {th('growth', 'Évolution')}
                <th className="px-3 py-2 text-left">Top communes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading && !rows.length
                ? Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={14} className="px-3 py-3">
                        <div className="h-5 animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))
                : rows.map((p, i) => <Row key={p.id} p={p} rank={(current - 1) * ui.pageSize + i + 1} unit={ui.unit} flash={flash.has(p.id)} onOpen={() => setSelected(p)} />)}
            </tbody>
          </table>
          {!isLoading && !rows.length && <div className="py-12 text-center text-xs text-muted-foreground">Aucun produit pour ces filtres.</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p, i) => (
            <Card key={p.id} p={p} rank={(current - 1) * ui.pageSize + i + 1} unit={ui.unit} delay={Math.min(i, 12) * 0.03} onOpen={() => setSelected(p)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5">
          Par page
          <select value={ui.pageSize} onChange={(e) => { ui.set({ pageSize: Number(e.target.value) }); setPage(1); }} className="rounded-md border border-border/70 bg-background px-1.5 py-0.5">
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded-md border border-border/70 p-1 disabled:opacity-40" aria-label="Page précédente">
            <ChevronLeft className="size-4" />
          </button>
          Page {current} / {pages}
          <button disabled={current >= pages} onClick={() => setPage(current + 1)} className="rounded-md border border-border/70 p-1 disabled:opacity-40" aria-label="Page suivante">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {data?.methodology && <p className="text-[10px] leading-relaxed text-muted-foreground">Méthode : {data.methodology}</p>}

      <ProductDrawer product={selectedLive} unit={ui.unit} onClose={() => setSelected(null)} />
    </div>
  );
}

function Row({ p, rank, unit, flash, onOpen }: { p: ProductItem; rank: number; unit: import('@/utils/productVolumeConverter').DisplayVolumeUnit; flash: boolean; onOpen: () => void }) {
  const img = resolveProductImage(p.image ?? null, p.name, p.brand);
  const pr = p.pricing;
  const risk = RISK_META[p.stockoutRisk] || RISK_META.UNKNOWN;
  const casier = pr?.containers?.find((c) => c.type === 'casier');
  const carton = pr?.containers?.find((c) => c.type === 'carton');
  return (
    <tr onClick={onOpen} className={`cursor-pointer transition-colors duration-700 hover:bg-muted/40 ${flash ? 'bg-amber-500/15' : ''}`}>
      <td className="px-3 py-2 font-mono text-muted-foreground">{rank}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {img ? <img src={img} alt="" loading="lazy" className="size-full object-contain" /> : <Package className="size-4 text-muted-foreground" />}
          </div>
          <div className="min-w-0">
            <div className="max-w-[220px] truncate font-semibold text-foreground">{p.name}</div>
            <div className="max-w-[220px] truncate text-[10px] text-muted-foreground">
              {p.brand} · {p.category}
              {p.format ? ` · ${p.format}` : ''}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-right font-mono font-semibold">{formatProductVolume(p.volume, unit, p.name, p.format).formatted}</td>
      <td className="px-3 py-2 text-right font-mono text-violet-400">{money(p.revenue || 0)}</td>
      <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-400">{F(pr?.avgSalePrice)}</td>
      <td className="px-3 py-2">
        {pr?.shelfPrice ? (
          <div title={`${pr.shelfPrice.count} établissements : ${pr.shelfPrice.min} → ${pr.shelfPrice.max} F`}>
            <PriceLadder shelf={pr.shelfPrice} avgSale={pr.avgSalePrice} unitCost={pr.unitCost} compact />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{int(pr.shelfPrice.min)}</span>
              <span>{int(pr.shelfPrice.max)}</span>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="font-mono">{F(pr?.unitCost)}</div>
        <div className="text-[10px] text-muted-foreground">
          {casier ? `casier ${int(casier.avgPrice)}` : ''}
          {casier && carton ? ' · ' : ''}
          {carton ? `carton ${int(carton.avgPrice)}` : ''}
        </div>
      </td>
      <td className={`px-3 py-2 text-right font-mono ${pr?.marginRate == null ? 'text-muted-foreground' : pr.marginRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {pr?.marginRate == null ? '—' : `${pr.marginRate} %`}
      </td>
      <td className="px-3 py-2 text-right font-mono">{p.rotationRate}</td>
      <td className="px-3 py-2 text-right font-mono">{p.stock?.medianDaysCover == null ? '—' : `${p.stock.medianDaysCover} j`}</td>
      <td className="px-3 py-2 text-right">
        <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${risk.cls}`} title={p.stock?.exposedSalesShare != null ? `${Math.round(p.stock.exposedSalesShare * 100)} % des ventes exposées` : undefined}>
          {risk.label}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-mono">{p.reorderFrequencyDays != null ? `${p.reorderFrequencyDays} j` : '—'}</td>
      <td className="px-3 py-2 text-right">
        <GrowthCell value={p.growth} />
      </td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground">
        <div className="max-w-[160px] truncate">{p.topCommunes.join(', ') || '—'}</div>
      </td>
    </tr>
  );
}

function Card({ p, rank, unit, delay, onOpen }: { p: ProductItem; rank: number; unit: import('@/utils/productVolumeConverter').DisplayVolumeUnit; delay: number; onOpen: () => void }) {
  const img = resolveProductImage(p.image ?? null, p.name, p.brand);
  const risk = RISK_META[p.stockoutRisk] || RISK_META.UNKNOWN;
  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: EASE }}
      whileTap={{ scale: 0.98 }}
      className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-3 text-left transition-colors hover:border-amber-500/40"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {img ? <img src={img} alt="" loading="lazy" className="size-full object-contain" /> : <Package className="size-5 text-muted-foreground" />}
          <span className="absolute left-0.5 top-0.5 rounded bg-background/90 px-1 font-mono text-[9px]">#{rank}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{p.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{p.brand}</div>
          <span className={`mt-1 inline-flex rounded border px-1 text-[9px] font-semibold ${risk.cls}`}>{risk.label}</span>
        </div>
        <GrowthCell value={p.growth} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="text-muted-foreground">Volume</div>
          <div className="font-mono font-semibold">{formatProductVolume(p.volume, unit, p.name, p.format).formatted}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Prix moyen</div>
          <div className="font-mono font-semibold text-emerald-400">{F(p.pricing?.avgSalePrice)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Marge</div>
          <div className="font-mono font-semibold">{p.pricing?.marginRate == null ? '—' : `${p.pricing.marginRate} %`}</div>
        </div>
      </div>
      <div className="mt-2">
        <PriceLadder shelf={p.pricing?.shelfPrice ?? null} avgSale={p.pricing?.avgSalePrice ?? null} unitCost={p.pricing?.unitCost ?? null} compact />
      </div>
    </motion.button>
  );
}

function GrowthCell({ value }: { value: number | null }) {
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

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[180px] cursor-pointer bg-transparent font-medium focus:outline-none">
        <option value="all">Toutes</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

const TONE = {
  amber: 'text-amber-400 bg-amber-500/10',
  rose: 'text-rose-400 bg-rose-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
};

function Kpi({
  i,
  icon,
  label,
  value,
  format,
  sub,
  loading,
  tone = 'amber',
}: {
  i: number;
  icon: React.ReactNode;
  label: string;
  value: number;
  format: (n: number) => string;
  sub: string;
  loading: boolean;
  tone?: keyof typeof TONE;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }} className="rounded-xl border border-border/80 bg-card/60 p-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className={`rounded-lg p-1.5 ${TONE[tone]}`}>{icon}</span>
      </div>
      <div className="mt-1 text-lg font-extrabold">
        <AnimatePresence mode="wait">
          {loading && !value ? <span className="inline-block h-6 w-20 animate-pulse rounded bg-muted" /> : <AnimatedNumber value={value} format={format} fromZero />}
        </AnimatePresence>
      </div>
      <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
    </motion.div>
  );
}
