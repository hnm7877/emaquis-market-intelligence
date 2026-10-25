'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, ArrowLeftRight, MapPin, Package, Swords, Trophy } from 'lucide-react';
import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';
import { resolveProductImage } from '@/utils/productImages';
import { Empty, Growth, Panel, Skeleton, fmtFcfa, fmtInt, fmtPct, EASE_OUT } from './ui';

interface Brand {
  id?: string;
  name: string;
  logo?: string | null;
  volume: number;
  revenue?: number;
  marketShare?: number;
  growth?: number | null;
  penetrationRate?: number;
  activePosCount?: number;
  fiefTerritorial?: string;
  mainZones?: string[];
  topCategory?: string;
  productCount?: number;
  topProducts?: { name: string; volume: number }[];
}

interface Props {
  unit: DisplayVolumeUnit;
  brandsData?: any;
  productsData?: any;
}

const SIDE = ['#f59e0b', '#06b6d4'];

/**
 * Onglet « Duel » : deux marques face à face sur les vrais chiffres du réseau, puis la liste
 * des produits qui reculent (à surveiller par les grossistes).
 */
export function BrandDuelTab({ unit, brandsData, productsData }: Props) {
  const brands: Brand[] = useMemo(() => (brandsData?.brands || []).filter((b: Brand) => b.volume > 0), [brandsData]);
  const [picked, setPicked] = useState<[string | null, string | null]>([null, null]);
  const a = brands.find((b) => b.name === picked[0]) || brands[0];
  const b = brands.find((x) => x.name === picked[1] && x.name !== a?.name) || brands.find((x) => x.name !== a?.name);
  const vol = (n: number) => formatProductVolume(n, unit, 'Total').formatted;

  const radar = useMemo(() => {
    if (!a || !b) return [];
    const metric = (label: string, va = 0, vb = 0) => {
      const max = Math.max(va, vb, 1e-9);
      return { label, a: Math.round((va / max) * 100), b: Math.round((vb / max) * 100) };
    };
    return [
      metric('Volume', a.volume, b.volume),
      metric('CA', a.revenue, b.revenue),
      metric('Part de marché', a.marketShare, b.marketShare),
      metric('Présence', a.penetrationRate, b.penetrationRate),
      metric('Maquis', a.activePosCount, b.activePosCount),
      metric('Gamme', a.productCount, b.productCount),
    ];
  }, [a, b]);

  const declining = useMemo(
    () =>
      ((productsData?.products || []) as any[])
        .filter((p) => typeof p.growth === 'number' && p.growth < 0 && p.volume > 0)
        .sort((x, y) => x.growth * x.volume - y.growth * y.volume)
        .slice(0, 8),
    [productsData],
  );

  if (!brandsData) return <Skeleton height={420} />;
  if (!a || !b) return <Empty height={300}>Il faut au moins deux marques avec des ventes pour les comparer.</Empty>;

  const rows: { label: string; va: React.ReactNode; vb: React.ReactNode; win?: 0 | 1 | null }[] = [
    { label: 'Volume vendu', va: vol(a.volume), vb: vol(b.volume), win: winner(a.volume, b.volume) },
    { label: "Chiffre d'affaires", va: fmtFcfa(a.revenue || 0), vb: fmtFcfa(b.revenue || 0), win: winner(a.revenue, b.revenue) },
    { label: 'Part de marché', va: fmtPct(a.marketShare), vb: fmtPct(b.marketShare), win: winner(a.marketShare, b.marketShare) },
    { label: 'Évolution', va: <Growth value={a.growth} />, vb: <Growth value={b.growth} />, win: winner(a.growth, b.growth) },
    { label: 'Présence dans les maquis', va: fmtPct(a.penetrationRate), vb: fmtPct(b.penetrationRate), win: winner(a.penetrationRate, b.penetrationRate) },
    { label: 'Maquis qui la vendent', va: fmtInt(a.activePosCount || 0), vb: fmtInt(b.activePosCount || 0), win: winner(a.activePosCount, b.activePosCount) },
    { label: 'Fief', va: a.fiefTerritorial || '—', vb: b.fiefTerritorial || '—', win: null },
    { label: 'Catégorie principale', va: a.topCategory || '—', vb: b.topCategory || '—', win: null },
  ];
  const score = rows.reduce((s, r) => (r.win === 0 ? [s[0] + 1, s[1]] : r.win === 1 ? [s[0], s[1] + 1] : s), [0, 0]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel
        className="xl:col-span-12"
        icon={<Swords className="size-4 text-amber-400" />}
        title="Duel de marques"
        subtitle="Choisissez deux marques : chaque ligne indique qui mène sur la période et les filtres en cours"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <BrandPicker brands={brands} value={a.name} exclude={b.name} color={SIDE[0]} onChange={(n) => setPicked([n, picked[1]])} />
              <button
                onClick={() => setPicked([b.name, a.name])}
                className="rounded-full border border-slate-700 p-1.5 text-slate-400 transition-colors hover:text-white"
                title="Inverser"
                aria-label="Inverser les marques"
              >
                <ArrowLeftRight className="size-3.5" />
              </button>
              <BrandPicker brands={brands} value={b.name} exclude={a.name} color={SIDE[1]} onChange={(n) => setPicked([picked[0], n])} />
            </div>

            <motion.div key={`${a.name}-${b.name}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="mt-3 overflow-hidden rounded-xl border border-slate-800">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-slate-900/80 px-3 py-2 text-xs font-semibold">
                <span style={{ color: SIDE[0] }}>{score[0]} point{score[0] > 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Trophy className="size-3.5 text-amber-400" />
                  {score[0] === score[1] ? 'Égalité' : `${score[0] > score[1] ? a.name : b.name} mène`}
                </span>
                <span className="text-right" style={{ color: SIDE[1] }}>
                  {score[1]} point{score[1] > 1 ? 's' : ''}
                </span>
              </div>
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-slate-800/70 px-3 py-2 text-[12px]">
                  <span className={`font-mono ${r.win === 0 ? 'font-semibold text-white' : 'text-slate-400'}`}>{r.va}</span>
                  <span className="text-center text-[10px] uppercase tracking-wide text-slate-500">{r.label}</span>
                  <span className={`text-right font-mono ${r.win === 1 ? 'font-semibold text-white' : 'text-slate-400'}`}>{r.vb}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="lg:col-span-5">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v} / 100`} contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                <Radar name={a.name} dataKey="a" stroke={SIDE[0]} fill={SIDE[0]} fillOpacity={0.3} animationDuration={500} />
                <Radar name={b.name} dataKey="b" stroke={SIDE[1]} fill={SIDE[1]} fillOpacity={0.3} animationDuration={500} />
              </RadarChart>
            </ResponsiveContainer>
            <p className="text-center text-[10px] text-slate-500">Chaque axe : 100 = la meilleure des deux marques</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[a, b].map((br, i) => (
            <div key={br.name} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: SIDE[i] }}>
                <Package className="size-3.5" /> Meilleures ventes {br.name}
              </div>
              <ul className="mt-2 space-y-1.5">
                {(br.topProducts || []).map((p) => {
                  const pct = br.volume ? (p.volume / br.volume) * 100 : 0;
                  return (
                    <li key={p.name} className="text-[11px]">
                      <div className="flex justify-between gap-2">
                        <span className="truncate text-slate-300">{p.name}</span>
                        <span className="font-mono text-slate-400">{vol(p.volume)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: SIDE[i] }} />
                      </div>
                    </li>
                  );
                })}
                {!br.topProducts?.length && <li className="text-[11px] text-slate-500">Aucun produit vendu sur la période.</li>}
              </ul>
              {!!br.mainZones?.length && (
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                  <MapPin className="size-3" />
                  {br.mainZones.map((z) => (
                    <span key={z} className="rounded-full border border-slate-700 px-1.5 py-0.5">
                      {z}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        className="xl:col-span-12"
        icon={<AlertTriangle className="size-4 text-rose-400" />}
        title="Produits en recul"
        subtitle="Classés par volume perdu : à surveiller avant de recommander du stock"
      >
        {!productsData ? (
          <Skeleton height={200} />
        ) : declining.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {declining.map((p, i) => {
              const img = resolveProductImage(p.image ?? null, p.name, p.brand);
              return (
                <motion.div
                  key={p.id || p.name}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: EASE_OUT }}
                  className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
                    {img ? <img src={img} alt="" className="size-full object-cover" /> : <Package className="size-4 text-rose-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-white">{p.name}</div>
                    <div className="truncate text-[10px] text-slate-400">{p.brand}</div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-slate-400">{vol(p.volume)}</span>
                      <Growth value={p.growth} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Empty height={120}>Aucun produit en recul sur cette période.</Empty>
        )}
      </Panel>
    </div>
  );
}

function winner(x?: number | null, y?: number | null): 0 | 1 | null {
  if (x == null || y == null || x === y) return null;
  return x > y ? 0 : 1;
}

function BrandPicker({ brands, value, exclude, color, onChange }: { brands: Brand[]; value: string; exclude: string; color: string; onChange: (n: string) => void }) {
  const current = brands.find((b) => b.name === value);
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-xl border bg-slate-900 px-2.5 py-2" style={{ borderColor: `${color}66` }}>
      {current?.logo ? <img src={current.logo} alt="" className="size-6 rounded bg-white/90 object-contain p-0.5" /> : <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="sr-only">Marque</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 cursor-pointer truncate bg-transparent text-sm font-semibold text-white focus:outline-none">
        {brands
          .filter((b) => b.name !== exclude)
          .map((b) => (
            <option key={b.name} value={b.name} className="bg-slate-950">
              {b.name}
            </option>
          ))}
      </select>
    </label>
  );
}
