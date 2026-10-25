'use client';

import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Activity, CalendarDays, Clock, Gauge, PieChart as PieIcon, Sparkles, Target, Boxes } from 'lucide-react';
import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';
import { AXIS, CHART_COLORS, ChartTip, Empty, GRID, Growth, Panel, Segmented, Skeleton, fmtCompact, fmtFcfa, fmtInt, fmtPct } from './ui';

interface Props {
  unit: DisplayVolumeUnit;
  overviewData?: any;
  productsData?: any;
  brandsData?: any;
  categoriesData?: any;
  trendsData?: any;
  trendsLoading?: boolean;
}

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

/**
 * Onglet « Graphiques » : uniquement des données réelles poussées par le serveur
 * (vue d'ensemble, produits, marques, catégories, tendances). Aucun défilement automatique.
 */
export function MarketChartsTab({ unit, overviewData, productsData, brandsData, categoriesData, trendsData, trendsLoading }: Props) {
  const vol = (n: number) => formatProductVolume(n, unit, 'Total').formatted;
  const [evolMetric, setEvolMetric] = useState<'volume' | 'revenue'>('volume');
  const [hourMode, setHourMode] = useState<'profile' | 'days'>('profile');

  const evolution = useMemo(
    () =>
      (overviewData?.salesEvolution || []).map((d: any) => ({
        label: dayLabel(d.date),
        current: evolMetric === 'volume' ? d.salesVolume : d.revenue,
        previous: evolMetric === 'volume' ? d.previousVolume ?? null : null,
        transactions: d.transactions,
      })),
    [overviewData, evolMetric],
  );

  const categories = useMemo(
    () =>
      (categoriesData?.categories || [])
        .filter((c: any) => c.volume > 0)
        .slice(0, 8)
        .map((c: any, i: number) => ({ name: c.name, value: c.volume, share: c.volumeShare, growth: c.growth, color: CHART_COLORS[i % CHART_COLORS.length] })),
    [categoriesData],
  );

  const products: any[] = useMemo(() => productsData?.products || [], [productsData]);
  const matrix = useMemo(() => {
    const rows = products.filter((p) => p.volume > 0 && typeof p.growth === 'number').slice(0, 80);
    const vols = rows.map((p) => p.volume).sort((a, b) => a - b);
    const median = vols[Math.floor(vols.length / 2)] || 0;
    return {
      median,
      stars: rows.filter((p) => p.volume >= median && p.growth >= 0).map((p) => ({ x: p.volume, y: p.growth, z: p.revenue || 1, name: p.name })),
      rising: rows.filter((p) => p.volume < median && p.growth >= 0).map((p) => ({ x: p.volume, y: p.growth, z: p.revenue || 1, name: p.name })),
      slowing: rows.filter((p) => p.growth < 0).map((p) => ({ x: p.volume, y: p.growth, z: p.revenue || 1, name: p.name })),
    };
  }, [products]);

  const brands = useMemo(
    () =>
      (brandsData?.brands || [])
        .filter((b: any) => b.volume > 0)
        .slice(0, 12)
        .map((b: any, i: number) => ({ name: b.name, size: b.volume, share: b.marketShare, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    [brandsData],
  );

  const status = overviewData?.kpis?.statusBreakdown;
  const statusRows = status
    ? [
        { name: 'Payées', value: status.success || 0, color: '#10b981' },
        { name: 'En attente', value: status.pending || 0, color: '#f59e0b' },
        { name: 'Offertes', value: status.offered || 0, color: '#8b5cf6' },
        { name: 'Retours', value: status.return || 0, color: '#06b6d4' },
        { name: 'Annulées', value: status.canceled || 0, color: '#f43f5e' },
      ]
    : [];
  const statusTotal = statusRows.reduce((s, r) => s + r.value, 0);

  const hourly = trendsData?.hourlyProfile || [];
  const byDay = trendsData?.byDayOfWeek || [];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* 1. Évolution */}
      <Panel
        className="xl:col-span-8"
        icon={<Activity className="size-4 text-amber-400" />}
        title="Évolution des ventes"
        subtitle={overviewData?.comparison?.label ? `Période : ${overviewData.comparison.label}` : 'Par jour, comparé à la période précédente'}
        actions={
          <Segmented id="evol" value={evolMetric} onChange={setEvolMetric} options={[{ id: 'volume', label: 'Volume' }, { id: 'revenue', label: 'CA' }]} />
        }
      >
        {!overviewData ? (
          <Skeleton height={260} />
        ) : evolution.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolution} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="evolFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} minTickGap={24} />
              <YAxis {...AXIS} tickFormatter={fmtCompact} width={52} />
              <Tooltip content={<ChartTip format={(n) => (evolMetric === 'revenue' ? fmtFcfa(n) : vol(n))} />} />
              {evolMetric === 'volume' && (
                <Area type="monotone" dataKey="previous" name="Période précédente" stroke="#64748b" strokeDasharray="4 4" fill="none" strokeWidth={1.5} isAnimationActive={false} />
              )}
              <Area type="monotone" dataKey="current" name={evolMetric === 'volume' ? 'Volume' : "Chiffre d'affaires"} stroke="#f59e0b" fill="url(#evolFill)" strokeWidth={2} animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty height={260} />
        )}
      </Panel>

      {/* 2. Statuts des ventes */}
      <Panel className="xl:col-span-4" icon={<Gauge className="size-4 text-emerald-400" />} title="Qualité des ventes" subtitle="Répartition des tickets par statut">
        {!overviewData ? (
          <Skeleton height={260} />
        ) : statusTotal ? (
          <div className="space-y-2.5 pt-1">
            {statusRows.map((r) => {
              const pct = (r.value / statusTotal) * 100;
              return (
                <div key={r.name}>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">{r.name}</span>
                    <span className="font-mono text-slate-400">
                      {fmtInt(r.value)} · {pct.toFixed(1)} %
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-[10px] text-slate-500">Un taux d&apos;annulation élevé signale des erreurs de caisse ou des litiges.</p>
          </div>
        ) : (
          <Empty height={240} />
        )}
      </Panel>

      {/* 3. Heures et jours */}
      <Panel
        className="xl:col-span-7"
        icon={<Clock className="size-4 text-cyan-400" />}
        title="Quand le marché consomme"
        subtitle={
          trendsData?.peakHours?.length
            ? `Heures de pointe : ${trendsData.peakHours.slice(0, 3).join(', ')} (${fmtPct(trendsData.peakHoursShare)} du volume)`
            : 'Volume moyen par heure et par jour observé'
        }
        actions={<Segmented id="hours" value={hourMode} onChange={setHourMode} options={[{ id: 'profile', label: 'Heures' }, { id: 'days', label: 'Jours' }]} />}
      >
        {trendsLoading && !trendsData ? (
          <Skeleton height={240} />
        ) : hourMode === 'profile' ? (
          hourly.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourly} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="hour" {...AXIS} interval={2} />
                <YAxis {...AXIS} tickFormatter={fmtCompact} width={44} />
                <Tooltip content={<ChartTip format={vol} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="weekdayVolume" name="Lundi → jeudi" fill="#06b6d4" radius={[3, 3, 0, 0]} animationDuration={600} />
                <Bar dataKey="weekendVolume" name="Vendredi → dimanche" fill="#f59e0b" radius={[3, 3, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty height={240} />
          )
        ) : byDay.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDay} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={fmtCompact} width={44} />
              <Tooltip content={<ChartTip format={vol} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="avgDailyVolume" name="Volume moyen / jour" radius={[4, 4, 0, 0]} animationDuration={600}>
                {byDay.map((d: any, i: number) => (
                  <Cell key={d.day} fill={i >= 4 ? '#f59e0b' : '#06b6d4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty height={240} />
        )}
        {trendsData && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
            <Fact label="Week-end vs semaine" value={trendsData.weekendOverWeekdayRatio != null ? `× ${trendsData.weekendOverWeekdayRatio}` : '—'} />
            <Fact label="Effet fin de mois" value={<Growth value={trendsData.monthEndEffect?.upliftPercent} />} />
            <Fact label="Jours observés" value={fmtInt(trendsData.daysObserved)} />
          </div>
        )}
      </Panel>

      {/* 4. Catégories */}
      <Panel className="xl:col-span-5" icon={<PieIcon className="size-4 text-violet-400" />} title="Poids des catégories" subtitle="Part du volume vendu">
        {!categoriesData ? (
          <Skeleton height={240} />
        ) : categories.length ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <ResponsiveContainer width="100%" height={220} className="sm:max-w-[220px]">
              <PieChart>
                <Pie data={categories} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="none" animationDuration={600}>
                  {categories.map((c: any) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip format={vol} />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-1.5">
              {categories.map((c: any) => (
                <li key={c.name} className="flex items-center gap-2 text-[11px]">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                  <span className="truncate text-slate-300">{c.name}</span>
                  <span className="ml-auto font-mono text-slate-400">{fmtPct(c.share)}</span>
                  <Growth value={c.growth} className="w-16 justify-end text-[10px]" />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty height={220} />
        )}
      </Panel>

      {/* 5. Matrice produits */}
      <Panel
        className="xl:col-span-7"
        icon={<Target className="size-4 text-rose-400" />}
        title="Matrice des produits"
        subtitle="Volume vendu × évolution : en haut à droite les produits phares, en bas ceux qui ralentissent"
      >
        {!productsData ? (
          <Skeleton height={280} />
        ) : matrix.stars.length + matrix.rising.length + matrix.slowing.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ left: -6, right: 12, top: 8 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Volume" {...AXIS} tickFormatter={fmtCompact} scale="log" domain={['auto', 'auto']} />
              <YAxis type="number" dataKey="y" name="Évolution" unit=" %" {...AXIS} width={52} />
              <ZAxis type="number" dataKey="z" range={[40, 360]} />
              <ReferenceLine y={0} stroke="#475569" />
              <ReferenceLine x={matrix.median} stroke="#334155" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }: any) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-[11px] text-white shadow-xl">
                      <div className="font-semibold">{payload[0].payload.name}</div>
                      <div className="text-slate-400">Volume : {vol(payload[0].payload.x)}</div>
                      <div className="text-slate-400">
                        Évolution : <Growth value={payload[0].payload.y} />
                      </div>
                    </div>
                  ) : null
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name="Produits phares" data={matrix.stars} fill="#10b981" fillOpacity={0.75} animationDuration={600} />
              <Scatter name="En progression" data={matrix.rising} fill="#06b6d4" fillOpacity={0.75} animationDuration={600} />
              <Scatter name="En recul" data={matrix.slowing} fill="#f43f5e" fillOpacity={0.75} animationDuration={600} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <Empty height={280}>Pas encore assez d&apos;historique pour calculer les évolutions.</Empty>
        )}
      </Panel>

      {/* 6. Marques */}
      <Panel className="xl:col-span-5" icon={<Boxes className="size-4 text-amber-400" />} title="Carte des marques" subtitle="Taille = volume vendu">
        {!brandsData ? (
          <Skeleton height={280} />
        ) : brands.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <Treemap data={brands} dataKey="size" stroke="#020617" animationDuration={600} content={<BrandTile />}>
              <Tooltip content={<ChartTip format={vol} />} />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <Empty height={280} />
        )}
      </Panel>

      {/* 7. Repères */}
      <Panel className="xl:col-span-12" icon={<Sparkles className="size-4 text-amber-400" />} title="À retenir" subtitle="Calculé à partir des données ci-dessus">
        <Takeaways overviewData={overviewData} products={products} categories={categoriesData?.categories || []} trendsData={trendsData} vol={vol} />
      </Panel>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="font-mono text-slate-200">{value}</div>
    </div>
  );
}

function BrandTile(props: any) {
  const { x, y, width, height, name, fill, share } = props;
  if (width <= 0 || height <= 0) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} fillOpacity={0.85} stroke="#020617" strokeWidth={2} />
      {width > 60 && height > 28 && (
        <text x={x + 8} y={y + 18} fill="#020617" fontSize={11} fontWeight={700}>
          {String(name).slice(0, Math.floor(width / 7))}
        </text>
      )}
      {width > 60 && height > 44 && share != null && (
        <text x={x + 8} y={y + 33} fill="#020617" fontSize={10}>
          {Number(share).toFixed(1)} %
        </text>
      )}
    </g>
  );
}

function Takeaways({ overviewData, products, categories, trendsData, vol }: { overviewData: any; products: any[]; categories: any[]; trendsData: any; vol: (n: number) => string }) {
  const items: { icon: React.ReactNode; text: React.ReactNode }[] = [];
  const growing = products.filter((p) => typeof p.growth === 'number' && p.volume > 0).sort((a, b) => b.growth - a.growth);
  if (growing[0]) items.push({ icon: <Activity className="size-3.5 text-emerald-400" />, text: <>Plus forte progression : <b>{growing[0].name}</b> (<Growth value={growing[0].growth} />)</> });
  const falling = growing[growing.length - 1];
  if (falling && falling.growth < 0) items.push({ icon: <Activity className="size-3.5 text-rose-400" />, text: <>Plus fort recul : <b>{falling.name}</b> (<Growth value={falling.growth} />)</> });
  const catUp = [...categories].filter((c) => typeof c.growth === 'number').sort((a, b) => b.growth - a.growth)[0];
  if (catUp) items.push({ icon: <PieIcon className="size-3.5 text-violet-400" />, text: <>Catégorie la plus dynamique : <b>{catUp.name}</b> (<Growth value={catUp.growth} />)</> });
  if (trendsData?.peakHours?.[0]) items.push({ icon: <Clock className="size-3.5 text-cyan-400" />, text: <>Livrez avant le pic de <b>{trendsData.peakHours[0]}</b> pour éviter les ruptures.</> });
  const best = [...(trendsData?.byDayOfWeek || [])].sort((a: any, b: any) => b.avgDailyVolume - a.avgDailyVolume)[0];
  if (best) items.push({ icon: <CalendarDays className="size-3.5 text-amber-400" />, text: <>Meilleur jour : <b>{best.day}</b> ({vol(best.avgDailyVolume)} en moyenne)</> });
  if (overviewData?.kpis?.acceleration != null)
    items.push({ icon: <Gauge className="size-3.5 text-amber-400" />, text: <>Accélération du marché : <Growth value={overviewData.kpis.acceleration} /></> });
  if (!items.length) return <Empty height={80} />;
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-[12px] text-slate-300">
          <span className="mt-0.5">{it.icon}</span>
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}
