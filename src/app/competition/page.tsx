'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BellRing, Crosshair, FileDown, Lightbulb, MapPin, Package, Plus, Scale, Search, Swords, Tag, Trophy, Users, X } from 'lucide-react';
import { BrandDuelView } from '@/components/competition/BrandDuelView';
import { useCompetitionQuery, useProductsQuery } from '@/hooks/market/useMarketQueries';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import type { Competition, ProductItem } from '@/lib/validations/market.schemas';
import { FilterBar } from '@/components/layout/FilterBar';
import { InfoTip } from '@/components/ui/InfoTip';
import { resolveProductImage } from '@/utils/productImages';

const EASE = [0.23, 1, 0.32, 1] as const;
const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#a78bfa'];
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const compact = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.abs(n) >= 10_000 ? `${(n / 1000).toFixed(1)} k` : int(n));
const F = (n: number | null | undefined) => (n == null ? '—' : `${int(n)} F`);
const pct = (n: number | null | undefined) => (n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)} %`);
const RISK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const RISK_LABEL: Record<string, string> = { HIGH: 'Élevé', MEDIUM: 'Modéré', LOW: 'Faible', UNKNOWN: 'Inconnu' };

type P = Competition['products'][number];

/** Lignes du duel : valeur, meilleur sens et explication */
const METRICS: { key: string; label: string; help: string; get: (p: P) => number | null; show: (p: P) => string; better: 'high' | 'low' }[] = [
  { key: 'volume', label: 'Volume vendu', help: 'Quantité vendue sur la période (unités).', get: (p) => p.volume, show: (p) => compact(p.volume), better: 'high' },
  { key: 'share', label: 'Part du duel', help: 'Part de chaque produit dans le volume total des produits comparés.', get: (p) => p.shareOfDuel, show: (p) => `${p.shareOfDuel} %`, better: 'high' },
  { key: 'revenue', label: "Chiffre d'affaires", help: 'Total encaissé par les établissements pour ce produit.', get: (p) => p.revenue, show: (p) => `${compact(p.revenue)} F`, better: 'high' },
  { key: 'growth', label: 'Évolution', help: 'Variation des ventes par rapport à la période précédente de même durée.', get: (p) => p.growth, show: (p) => pct(p.growth), better: 'high' },
  { key: 'sellers', label: 'Maquis vendeurs', help: 'Nombre d’établissements qui ont vendu le produit sur la période : sa force de distribution.', get: (p) => p.sellers, show: (p) => int(p.sellers), better: 'high' },
  { key: 'rotation', label: 'Rotation', help: 'Bouteilles vendues par semaine dans chaque établissement qui le vend : sa force de vente sur place.', get: (p) => p.rotationRate, show: (p) => (p.rotationRate == null ? '—' : `${p.rotationRate} / sem.`), better: 'high' },
  { key: 'price', label: 'Prix moyen payé', help: 'Prix réellement payé par les clients, en moyenne (le moins cher est mis en avant).', get: (p) => p.avgSalePrice, show: (p) => F(p.avgSalePrice), better: 'low' },
  { key: 'margin', label: 'Marge établissement', help: 'Ce que gagne l’établissement par bouteille, en % du prix : un argument pour qu’il pousse le produit.', get: (p) => p.marginRate, show: (p) => (p.marginRate == null ? '—' : `${p.marginRate} %`), better: 'high' },
  { key: 'risk', label: 'Risque de rupture', help: 'Risque de manquer de stock chez les établissements (le plus faible est mis en avant).', get: (p) => RISK[p.stockoutRisk] ?? null, show: (p) => RISK_LABEL[p.stockoutRisk] ?? '—', better: 'low' },
];

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  return (new URLSearchParams(window.location.search).get('p') || '').split(',').filter((x) => /^[a-f0-9]{24}$/i.test(x)).slice(0, 4);
}

/**
 * Concurrence : face-à-face de 2 à 4 produits, calculé par le serveur sur les ventes réelles
 * et poussé par WebSocket (aucun établissement identifié). Choix des produits gardé dans l'adresse.
 */
export default function CompetitionPage() {
  const { filters, setFilter, resetFilters } = useMarketFilterStore();
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const { data: productsData } = useProductsQuery();
  const sold: ProductItem[] = useMemo(() => ((productsData?.products || []) as ProductItem[]).filter((p) => p.volume > 0), [productsData]);
  const [ids, setIds] = useState<string[]>([]);
  const initialized = useRef(false);

  // Sélection : celle du lien partagé, sinon les deux produits les plus vendus
  useEffect(() => {
    if (initialized.current || !sold.length) return;
    initialized.current = true;
    const fromUrl = readIds().filter((id) => sold.some((p) => p.id === id));
    setIds(fromUrl.length >= 2 ? fromUrl : sold.slice(0, 2).map((p) => p.id));
  }, [sold]);
  useEffect(() => {
    if (!initialized.current) return;
    const url = `${window.location.pathname}${ids.length ? `?p=${ids.join(',')}` : ''}`;
    window.history.replaceState(null, '', url);
  }, [ids]);

  const { data, isLoading, isError } = useCompetitionQuery(ids);
  const c = data as Competition | undefined;
  const prods = useMemo(() => ids.map((id) => c?.products.find((p) => p.id === id)).filter(Boolean) as P[], [c, ids]);
  const colorOf = (id: string) => COLORS[Math.max(0, ids.indexOf(id))];
  const nameOf = (id: string) => prods.find((p) => p.id === id)?.name || sold.find((p) => p.id === id)?.name || 'Produit';

  const presets = useMemo(() => {
    const first = sold[0];
    const sameCat = first ? sold.filter((p) => p.category === first.category && p.brand !== first.brand) : [];
    const byBrand = new Map<string, ProductItem>();
    sold.forEach((p) => !byBrand.has(p.brand) && byBrand.set(p.brand, p));
    return [
      { label: 'Top 2 du marché', ids: sold.slice(0, 2).map((p) => p.id) },
      { label: 'Top 4 du marché', ids: sold.slice(0, 4).map((p) => p.id) },
      { label: 'N° 1 vs son rival direct', ids: first && sameCat[0] ? [first.id, sameCat[0].id] : [] },
      { label: 'Leaders des 3 premières marques', ids: [...byBrand.values()].slice(0, 3).map((p) => p.id) },
    ].filter((x) => x.ids.length >= 2);
  }, [sold]);

  // Score : 1 point par ligne gagnée
  const score = useMemo(() => {
    const pts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
    METRICS.forEach((m) => {
      const vals = prods.map((p) => ({ id: p.id, v: m.get(p) })).filter((x) => x.v != null) as { id: string; v: number }[];
      if (vals.length < 2) return;
      const best = m.better === 'high' ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v));
      const winners = vals.filter((x) => x.v === best);
      if (winners.length === 1) pts[winners[0].id] += 1;
    });
    return pts;
  }, [prods, ids]);
  const leaderId = ids.length ? [...ids].sort((a, b) => (score[b] || 0) - (score[a] || 0))[0] : null;
  const [mode, setMode] = useState<'products' | 'brands'>('products');

  // Alerte de bascule : une commune change de produit leader pendant que la page est ouverte.
  // Le dernier état est gardé dans ce navigateur pour signaler aussi les bascules entre deux visites.
  const [flips, setFlips] = useState<{ commune: string; from: string; to: string; at: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const flipKey = ids.length >= 2 ? `mi-bascules-${[...ids].sort().join('-')}` : null;
  useEffect(() => {
    if (!flipKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(flipKey) || 'null');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- historique des bascules de ce duel
      setFlips(Array.isArray(saved?.flips) ? saved.flips.slice(0, 20) : []);
    } catch {
      setFlips([]);
    }
  }, [flipKey]);
  useEffect(() => {
    if (!flipKey || !c?.battles?.length) return;
    let saved: { leaders?: Record<string, string>; flips?: typeof flips } = {};
    try {
      saved = JSON.parse(localStorage.getItem(flipKey) || '{}') || {};
    } catch {
      saved = {};
    }
    const prev = saved.leaders || {};
    const fresh: typeof flips = [];
    c.battles.forEach((b) => {
      if (prev[b.commune] && prev[b.commune] !== b.leader && ids.includes(prev[b.commune]))
        fresh.push({ commune: b.commune, from: prev[b.commune], to: b.leader, at: new Date().toISOString() });
    });
    const leaders = { ...prev, ...Object.fromEntries(c.battles.map((b) => [b.commune, b.leader])) };
    const all = [...fresh, ...(saved.flips || [])].slice(0, 20);
    try {
      localStorage.setItem(flipKey, JSON.stringify({ leaders, flips: all }));
    } catch {
      /* stockage indisponible : alertes de la session seulement */
    }
    if (fresh.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nouvelles bascules reçues en direct
      setFlips(all);
      setToast(`${fresh[0].commune} : ${nameOf(fresh[0].to)} passe devant ${nameOf(fresh[0].from)}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`);
      const t = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nameOf dépend des mêmes données
  }, [c, flipKey]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 pb-12">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${isConnected ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground'}`}>
            <span className={`size-1.5 rounded-full ${isConnected ? 'animate-pulse bg-amber-400' : 'bg-muted-foreground'}`} />
            {isConnected ? 'En direct' : 'Reconnexion…'}
          </span>
          <span className="text-muted-foreground">{c?.comparisonLabel || 'période choisie'}</span>
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
          <Swords className="size-5 text-amber-500 md:size-6" />
          Concurrence
        </h1>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Face-à-face de 2 à 4 produits ou marques sur les ventes réelles : qui gagne, où, à quel prix, et quels maquis conquérir.
          </p>
          <div className="flex items-center gap-2 print:hidden">
            <div className="flex h-8 items-center rounded-lg border border-border/70 bg-muted/40 p-0.5" role="radiogroup" aria-label="Comparer">
              {(['products', 'brands'] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`relative h-full rounded-md px-3 text-xs transition-colors ${mode === m ? 'font-semibold text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {mode === m && <motion.span layoutId="comp-mode" className="absolute inset-0 rounded-md bg-amber-500" transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }} />}
                  <span className="relative">{m === 'products' ? 'Produits' : 'Marques'}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => window.print()}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 hover:bg-amber-400"
              title="Enregistrer le duel en PDF (choisir « Enregistrer au format PDF » dans la fenêtre d’impression)"
            >
              <FileDown className="size-3.5" /> PDF
            </button>
          </div>
        </div>
      </motion.header>

      <div className="print:hidden">
        <FilterBar filters={filters} onFilterChange={setFilter} onReset={resetFilters} />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="fixed right-5 top-20 z-50 flex items-center gap-2 rounded-xl border border-amber-500/50 bg-slate-950 px-4 py-2.5 text-xs text-white shadow-2xl"
          >
            <BellRing className="size-4 text-amber-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'brands' ? (
        <BrandDuelView />
      ) : (
      <>
      {/* Choix des produits */}
      <section className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {ids.map((id, i) => (
            <span key={id} className="flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2 text-xs" style={{ borderColor: `${COLORS[i]}80`, background: `${COLORS[i]}14` }}>
              <span className="size-2.5 rounded-full" style={{ background: COLORS[i] }} />
              <span className="max-w-[180px] truncate font-semibold">{nameOf(id)}</span>
              {ids.length > 2 && (
                <button onClick={() => setIds(ids.filter((x) => x !== id))} className="text-muted-foreground hover:text-foreground" aria-label="Retirer">
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
          {ids.length < 4 && <ProductPicker products={sold} exclude={ids} onPick={(id) => setIds([...ids, id])} />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">Raccourcis :</span>
          {presets.map((p) => (
            <button key={p.label} onClick={() => setIds(p.ids)} className="rounded-md border border-border/70 px-2 py-0.5 text-muted-foreground transition-colors hover:border-amber-500/40 hover:text-foreground">
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {ids.length < 2 ? (
        <Empty>Choisissez au moins deux produits à comparer.</Empty>
      ) : isLoading && !c ? (
        <div className="h-96 animate-pulse rounded-xl bg-muted/40" />
      ) : isError || c?.error ? (
        <Empty>{c?.error || 'Comparaison momentanément indisponible. Elle se relancera automatiquement à la prochaine mise à jour.'}</Empty>
      ) : !prods.length ? (
        <Empty>Aucune vente pour ces produits sur la période et les filtres choisis.</Empty>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={ids.join()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="space-y-4">
            {/* Cartes */}
            <div className={`grid gap-3 ${prods.length === 2 ? 'grid-cols-1 md:grid-cols-2' : prods.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 xl:grid-cols-4'}`}>
              {prods.map((p, i) => {
                const img = resolveProductImage(p.image, p.name, p.brand);
                const lead = p.id === leaderId;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05, ease: EASE }}
                    className="relative overflow-hidden rounded-xl border bg-card/60 p-3"
                    style={{ borderColor: `${COLORS[i]}66` }}
                  >
                    {lead && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                        <Trophy className="size-3" /> Mène
                      </span>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {img ? <img src={img} alt="" className="size-full object-contain" /> : <Package className="size-5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{p.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {p.brand} · {p.category}
                        </div>
                        <div className="mt-0.5 text-[11px]">
                          <b style={{ color: COLORS[i] }}>{score[p.id] || 0} pts</b> <span className="text-muted-foreground">sur {METRICS.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Part du duel</div>
                        <div className="font-mono text-2xl font-black" style={{ color: COLORS[i] }}>
                          {p.shareOfDuel} %
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        {compact(p.volume)} vendus
                        <br />
                        {int(p.sellers)} maquis
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${p.shareOfDuel}%`, background: COLORS[i] }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Tableau des scores */}
            <Panel icon={<Scale className="size-4 text-amber-500" />} title="Le duel, critère par critère" help="Chaque ligne donne 1 point au meilleur produit (le plus haut, ou le plus bas pour le prix et le risque de rupture).">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase text-muted-foreground">
                      <th className="py-1.5 text-left font-medium">Critère</th>
                      {prods.map((p, i) => (
                        <th key={p.id} className="py-1.5 text-right font-medium" style={{ color: COLORS[i] }}>
                          <span className="inline-block max-w-[140px] truncate align-bottom">{p.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((m) => {
                      const vals = prods.map((p) => m.get(p));
                      const known = vals.filter((v): v is number => v != null);
                      const best = known.length >= 2 ? (m.better === 'high' ? Math.max(...known) : Math.min(...known)) : null;
                      return (
                        <tr key={m.key} className="border-t border-border/50">
                          <td className="py-2">
                            <span className="inline-flex items-center text-muted-foreground">
                              {m.label}
                              <InfoTip title={m.label} text={m.help} />
                            </span>
                          </td>
                          {prods.map((p, i) => {
                            const win = best != null && vals[i] === best && known.filter((v) => v === best).length === 1;
                            return (
                              <td key={p.id} className={`py-2 text-right font-mono ${win ? 'font-bold' : 'text-muted-foreground'}`} style={win ? { color: COLORS[i] } : undefined}>
                                {win && <Trophy className="mr-1 inline size-3" />}
                                {m.show(p)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Panel icon={<Swords className="size-4 text-amber-500" />} title="Ventes jour par jour" help="Unités vendues chaque jour pour chaque produit, sur la période choisie.">
                {c!.daily.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={c!.daily} margin={{ left: -10, right: 8, top: 6 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} minTickGap={24} tickFormatter={(d) => String(d).slice(5).split('-').reverse().join('/')} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                      <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} formatter={(v, n) => [int(Number(v)), nameOf(String(n))]} />
                      {ids.map((id) => (
                        <Line key={id} dataKey={id} name={id} stroke={colorOf(id)} strokeWidth={2} dot={false} animationDuration={600} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty small>Pas de ventes datées sur la période.</Empty>
                )}
              </Panel>
              <Panel icon={<Swords className="size-4 text-cyan-500" />} title="Heures de vente" help="Unités vendues par heure de la journée, à l’heure d’Abidjan (UTC) pour tous les pays — décalage d’1 à 2 h pour la RD Congo : quand chaque produit l’emporte.">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={c!.hourly} margin={{ left: -10, right: 8, top: 6 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} formatter={(v, n) => [int(Number(v)), nameOf(String(n))]} />
                    <Legend formatter={(v) => nameOf(String(v))} wrapperStyle={{ fontSize: 10 }} />
                    {ids.map((id) => (
                      <Bar key={id} dataKey={id} name={id} fill={colorOf(id)} radius={[2, 2, 0, 0]} animationDuration={600} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* Batailles par commune */}
            <Panel icon={<MapPin className="size-4 text-rose-500" />} title="Bataille des communes" help="Dans chaque commune, la part de chaque produit parmi les produits comparés. « Serrée » : moins de 10 points d’écart entre les deux premiers.">
              <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                {c!.battles.map((b) => (
                  <div key={b.commune} className="grid grid-cols-[140px_1fr_auto] items-center gap-3 text-[11px]">
                    <span className="truncate font-medium">{b.commune}</span>
                    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                      {ids.map((id) => (
                        <div key={id} title={`${nameOf(id)} : ${b.shares[id]} %`} className="h-full transition-[width] duration-700" style={{ width: `${b.shares[id] || 0}%`, background: colorOf(id) }} />
                      ))}
                    </div>
                    <span className="flex w-36 items-center justify-end gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: colorOf(b.leader) }} />
                      <span className="truncate">{b.shares[b.leader]} %</span>
                      {b.margin < 10 && <span className="rounded bg-amber-500/15 px-1 text-[9px] font-semibold text-amber-400">serrée</span>}
                    </span>
                  </div>
                ))}
                {!c!.battles.length && <Empty small>Aucune vente localisée.</Empty>}
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {/* Prix face à face */}
              <Panel icon={<Tag className="size-4 text-emerald-500" />} title="Prix dans les mêmes maquis" help="Comparaison des prix affichés dans les établissements qui vendent les deux produits (stock synchronisé), et part de volume de chacun dans ces mêmes établissements.">
                <div className="space-y-3">
                  {c!.priceDuels.map((d) => (
                    <div key={d.b} className="rounded-lg border border-border/70 p-2.5 text-[12px]">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span style={{ color: colorOf(d.a) }}>{nameOf(d.a)}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span style={{ color: colorOf(d.b) }}>{nameOf(d.b)}</span>
                      </div>
                      {d.establishments ? (
                        <>
                          <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-muted">
                            <div style={{ width: `${(d.aCheaper / d.establishments) * 100}%`, background: colorOf(d.a) }} />
                            <div style={{ width: `${(d.same / d.establishments) * 100}%`, background: '#64748b' }} />
                            <div style={{ width: `${(d.bCheaper / d.establishments) * 100}%`, background: colorOf(d.b) }} />
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            Sur {d.establishments} maquis : {nameOf(d.a)} moins cher dans {d.aCheaper}, même prix dans {d.same}, plus cher dans {d.bCheaper}. Écart moyen{' '}
                            <b className="text-foreground">{d.avgGap == null ? '—' : `${d.avgGap > 0 ? '+' : ''}${int(d.avgGap)} F`}</b>. Part de volume de {nameOf(d.a)} dans ces maquis :{' '}
                            <b className="text-foreground">{d.aVolumeShare ?? '—'} %</b>.
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground">Aucun maquis ne vend les deux avec un prix connu.</p>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Distribution */}
              <Panel icon={<Users className="size-4 text-violet-500" />} title="Distribution" help="Combien de maquis vendent chaque produit, combien le vendent sans les concurrents (exclusifs), et combien vendent tous les produits comparés.">
                {c!.overlap && (
                  <div className="space-y-2.5 text-[11px]">
                    {c!.overlap.per.map((o) => (
                      <div key={o.product}>
                        <div className="flex justify-between">
                          <span className="font-medium" style={{ color: colorOf(o.product) }}>
                            {nameOf(o.product)}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {int(o.sellers)} maquis · {int(o.exclusive)} exclusifs
                          </span>
                        </div>
                        <div className="mt-0.5 flex h-2 overflow-hidden rounded-full bg-muted">
                          <div style={{ width: `${(o.exclusive / Math.max(1, c!.overlap!.total)) * 100}%`, background: colorOf(o.product) }} />
                          <div style={{ width: `${((o.sellers - o.exclusive) / Math.max(1, c!.overlap!.total)) * 100}%`, background: `${colorOf(o.product)}66` }} />
                        </div>
                      </div>
                    ))}
                    <p className="text-muted-foreground">
                      {int(c!.overlap.sharedByAll)} maquis sur {int(c!.overlap.total)} vendent tous les produits comparés. Partie pleine = exclusifs, partie claire = partagés.
                    </p>
                  </div>
                )}
              </Panel>
            </div>

            {/* Cibles à conquérir */}
            <Panel icon={<Crosshair className="size-4 text-rose-500" />} title="Maquis à conquérir" help="Établissements qui vendent un produit concurrent mais pas celui-ci, regroupés par commune : la liste de prospection de chaque marque.">
              <div className={`grid gap-3 ${prods.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {c!.targets.map((t) => (
                  <div key={t.product} className="rounded-lg border border-border/70 p-2.5">
                    <div className="text-xs font-semibold" style={{ color: colorOf(t.product) }}>
                      {nameOf(t.product)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{int(t.total)} maquis vendent un concurrent mais pas ce produit</div>
                    <ul className="mt-1.5 space-y-0.5 text-[11px]">
                      {t.communes.map((x) => (
                        <li key={x.commune} className="flex justify-between">
                          <span>{x.commune}</span>
                          <span className="font-mono">{x.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Bascules de leadership */}
            <Panel icon={<BellRing className="size-4 text-amber-500" />} title="Bascules de leadership" help="Communes où le produit en tête a changé depuis votre dernière consultation de ce duel ou pendant que la page est ouverte (mémorisé dans ce navigateur).">
              {flips.length ? (
                <ul className="space-y-1 text-[12px]">
                  {flips.map((f) => (
                    <li key={`${f.commune}-${f.at}`} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{f.commune}</span>:
                      <span style={{ color: colorOf(f.to) }}>{nameOf(f.to)}</span> passe devant <span style={{ color: colorOf(f.from) }}>{nameOf(f.from)}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(f.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">Aucune bascule pour l’instant. Le leader de chaque commune est surveillé en direct.</p>
              )}
            </Panel>

            <Insights c={c!} prods={prods} nameOf={nameOf} />
          </motion.div>
        </AnimatePresence>
      )}
      </>
      )}
    </div>
  );
}

/** Lecture automatique du duel (phrases calculées à partir des chiffres) */
function Insights({ c, prods, nameOf }: { c: Competition; prods: P[]; nameOf: (id: string) => string }) {
  const out: string[] = [];
  const byVol = [...prods].sort((a, b) => b.volume - a.volume);
  if (byVol[1]) out.push(`${byVol[0].name} vend ${(byVol[0].volume / Math.max(1, byVol[1].volume)).toFixed(1)} fois plus que ${byVol[1].name} sur la période.`);
  const fastest = [...prods].filter((p) => p.growth != null).sort((a, b) => (b.growth as number) - (a.growth as number))[0];
  if (fastest && fastest.growth != null && fastest.id !== byVol[0].id && fastest.growth > (byVol[0].growth ?? 0)) out.push(`${fastest.name} progresse plus vite (${pct(fastest.growth)}) que le leader : l’écart se réduit.`);
  const won = (id: string) => c.battles.filter((b) => b.leader === id).length;
  prods.forEach((p) => out.push(`${p.name} gagne dans ${won(p.id)} commune(s) sur ${c.battles.length}.`));
  const tight = c.battles.filter((b) => b.margin < 10).slice(0, 3);
  if (tight.length) out.push(`Communes les plus disputées : ${tight.map((b) => b.commune).join(', ')}.`);
  c.priceDuels.forEach((d) => {
    if (d.establishments >= 3 && d.avgGap != null && d.aVolumeShare != null && d.avgGap > 0 && d.aVolumeShare > 50)
      out.push(`${nameOf(d.a)} est plus cher que ${nameOf(d.b)} (${int(d.avgGap)} F en moyenne) mais vend plus dans les mêmes maquis : préférence de marque forte.`);
    if (d.establishments >= 3 && d.avgGap != null && d.aVolumeShare != null && d.avgGap < 0 && d.aVolumeShare < 50)
      out.push(`${nameOf(d.a)} est moins cher que ${nameOf(d.b)} et vend pourtant moins dans les mêmes maquis : le prix ne suffit pas, travailler la visibilité.`);
  });
  const bestMargin = [...prods].filter((p) => p.marginRate != null).sort((a, b) => (b.marginRate as number) - (a.marginRate as number))[0];
  if (bestMargin) out.push(`${bestMargin.name} laisse la meilleure marge aux établissements (${bestMargin.marginRate} %) : argument pour le faire mettre en avant.`);
  return (
    <Panel icon={<Lightbulb className="size-4 text-amber-500" />} title="À retenir" help="Phrases calculées automatiquement à partir des chiffres ci-dessus.">
      <ul className="grid gap-2 text-[12px] md:grid-cols-2">
        {out.map((t) => (
          <li key={t} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
            {t}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ProductPicker({ products, exclude, onPick }: { products: ProductItem[]; exclude: string[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => !exclude.includes(p.id) && (!s || p.name.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s))).slice(0, 40);
  }, [products, exclude, q]);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-amber-500/50 hover:text-foreground">
        <Plus className="size-3" /> Ajouter un produit
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-8 z-30 w-80 rounded-xl border border-border bg-popover p-2 shadow-2xl"
          >
            <label className="relative block">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value.slice(0, 60))} placeholder="Produit ou marque…" className="h-8 w-full rounded-lg border border-border bg-background pl-7 text-xs focus:outline-none" />
            </label>
            <ul className="mt-1.5 max-h-72 overflow-y-auto">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onPick(p.id);
                      setOpen(false);
                      setQ('');
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {p.brand} · {p.category}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{compact(p.volume)}</span>
                  </button>
                </li>
              ))}
              {!list.length && <li className="px-2 py-2 text-[11px] text-muted-foreground">Aucun produit.</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Panel({ icon, title, help, children }: { icon: React.ReactNode; title: string; help: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/70 bg-card/60 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
        <InfoTip title={title} text={help} />
      </h2>
      {children}
    </section>
  );
}

function Empty({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return <div className={`flex items-center justify-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground ${small ? 'h-24' : 'h-48'}`}>{children}</div>;
}
