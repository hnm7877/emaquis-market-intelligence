'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Clock, Coins, Flame, Moon, ShoppingBasket, Sparkles, Sun, Sunrise, Sunset, TrendingUp } from 'lucide-react';
import { HourlyConsumptionChart } from '@/components/charts/HourlyConsumptionChart';
import { FilterBar } from '@/components/layout/FilterBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { InfoTip } from '@/components/ui/InfoTip';
import { useTrendsQuery } from '@/hooks/market/useMarketQueries';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import type { Trends } from '@/lib/validations/market.schemas';
import { formatGrowth, growthColorClass, isAvailable } from '@/utils/metrics';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.abs(n) >= 10_000 ? `${(n / 1000).toFixed(1)} k` : int(n);
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYPART_ICONS = [Moon, Sunrise, Sun, Sunset];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1] ?? m} ${m.slice(0, 4)}`;
const dateLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

const HELP = {
  volume: 'Unités vendues observées dans le réseau sur la période filtrée.',
  revenue: "Total encaissé par les établissements sur la période, en francs CFA.",
  basket: "Montant moyen d'une vente (ticket) : chiffre d'affaires / nombre de ventes.",
  momentum: 'Unités vendues sur les 7 derniers jours de la période, comparées aux 7 jours précédents.',
  golden: "Jour et heure où il se vend le plus, en moyenne par jour observé. C'est le meilleur moment pour une animation ou une promotion.",
  heatmap: "Chaque case = unités vendues en moyenne à cette heure, ce jour-là (moyenne sur les jours réellement observés). Plus c'est foncé, plus ça vend.",
  dayparts: 'Répartition des ventes par tranche de 6 heures et produits les plus vendus dans chacune.',
  week: 'Moyenne par jour observé, pour chaque jour de la semaine.',
  daily: 'Ventes jour par jour (120 derniers jours de la période au maximum).',
};

function Kpi({ icon: Icon, label, help, children, sub, delay = 0 }: { icon: React.ElementType; label: string; help: string; children: React.ReactNode; sub?: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE, delay }}>
      <Card className="h-full border border-border/80 bg-card/70 backdrop-blur-md p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5 text-amber-500" />
          {label}
          <InfoTip text={help} title={label} />
        </div>
        <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{children}</div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
      </Card>
    </motion.div>
  );
}

function Heatmap({ trends }: { trends: Trends }) {
  const [hover, setHover] = useState<{ d: number; h: number; v: number } | null>(null);
  const { cells, max } = useMemo(() => {
    const observed = DAY_KEYS.map((_, i) => trends.byDayOfWeek[i]?.daysObserved ?? 0);
    const c = trends.hourlyMatrix.map((row) => DAY_KEYS.map((k, i) => (observed[i] > 0 ? Number(row[k] ?? 0) / observed[i] : 0)));
    return { cells: c, max: Math.max(0, ...c.flat()) };
  }, [trends.hourlyMatrix, trends.byDayOfWeek]);

  if (max <= 0) return <p className="py-10 text-center text-xs text-muted-foreground">Aucune vente observée sur ce périmètre.</p>;
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] gap-[3px]" style={{ gridTemplateColumns: '36px repeat(24, minmax(0, 1fr))' }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-[9px] text-muted-foreground tabular-nums">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
          {DAY_SHORT.map((label, d) => (
            <React.Fragment key={label}>
              <div className="flex items-center text-[10px] font-medium text-muted-foreground">{label}</div>
              {Array.from({ length: 24 }, (_, h) => {
                const v = cells[h]?.[d] ?? 0;
                const a = v > 0 ? 0.12 + 0.88 * Math.sqrt(v / max) : 0;
                return (
                  <div
                    key={h}
                    onMouseEnter={() => setHover({ d, h, v })}
                    onMouseLeave={() => setHover(null)}
                    className="aspect-square rounded-[3px] border border-border/30 transition-transform hover:scale-125"
                    style={{ backgroundColor: v > 0 ? `rgba(245, 158, 11, ${a.toFixed(3)})` : 'transparent' }}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="min-h-4">
          {hover ? (
            <>
              <strong className="text-foreground">
                {DAY_SHORT[hover.d]} {hover.h}h - {hover.h + 1}h
              </strong>{' '}
              : {hover.v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} u. en moyenne
            </>
          ) : (
            'Survolez une case pour voir le détail.'
          )}
        </span>
        <span className="flex items-center gap-1.5">
          Faible
          <span className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(245,158,11,1))' }} />
          Fort
        </span>
      </div>
    </div>
  );
}

const ChartTip = ({ active, payload, label, unit }: { active?: boolean; payload?: { value?: number; name?: string; color?: string }[]; label?: string; unit: string[] }) =>
  active && payload?.length ? (
    <div className="rounded-lg border border-border bg-card/95 p-2.5 text-xs shadow-xl backdrop-blur-xl">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name} : {int(p.value)} {unit[i] ?? ''}
        </p>
      ))}
    </div>
  ) : null;

/**
 * Tendances & horaires : données par WebSocket (React Query, contrôle Zod), filtres globaux
 * appliqués par le serveur. Tous les chiffres viennent des ventes réellement observées.
 */
export default function TrendsPage() {
  const { data, isLoading, isError } = useTrendsQuery();
  const trends = data as Trends | undefined;
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const [weekMetric, setWeekMetric] = useState<'volume' | 'revenue'>('volume');
  const [dailyMetric, setDailyMetric] = useState<'volume' | 'revenue'>('volume');

  const peakHours = trends?.peakHours ?? [];
  const weekendRatio = trends?.weekendOverWeekdayRatio ?? null;
  const monthEnd = trends?.monthEndEffect;
  const byDay = useMemo(() => trends?.byDayOfWeek ?? [], [trends?.byDayOfWeek]);
  const busiestDay = useMemo(() => [...byDay].sort((a, b) => b.avgDailyVolume - a.avgDailyVolume)[0], [byDay]);
  const weekData = useMemo(() => byDay.map((d, i) => ({ day: DAY_SHORT[i] ?? d.day, value: weekMetric === 'volume' ? d.avgDailyVolume : d.avgDailyRevenue })), [byDay, weekMetric]);
  const dailyData = useMemo(() => (trends?.daily ?? []).map((d) => ({ date: dateLabel(d.date), value: dailyMetric === 'volume' ? d.volume : d.revenue })), [trends?.daily, dailyMetric]);
  const mom = trends?.momentum;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="size-5 text-amber-500" />
              Tendances &amp; Horaires
            </h1>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1.5 py-0.5">
              <span className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {isLoading ? 'Calcul des dynamiques horaires…' : isError ? 'API indisponible' : `${int(trends?.daysObserved ?? 0)} jours observés`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Quand le réseau E-Maquis consomme : heures, jours, tranches horaires et évolution.</p>
        </div>
      </div>

      <FilterBar />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={TrendingUp} label="Unités vendues" help={HELP.volume} sub={`${int(trends?.totalTransactions ?? 0)} ventes`}>
          <AnimatedNumber value={trends?.totalVolume ?? 0} format={compact} />
        </Kpi>
        <Kpi icon={Coins} label="Chiffre d'affaires" help={HELP.revenue} delay={0.04}>
          <AnimatedNumber value={trends?.totalRevenue ?? 0} format={(n) => `${compact(n)} F`} />
        </Kpi>
        <Kpi icon={ShoppingBasket} label="Panier moyen" help={HELP.basket} delay={0.08}>
          {isAvailable(trends?.avgBasket) ? <AnimatedNumber value={trends!.avgBasket as number} format={(n) => `${int(n)} F`} /> : '—'}
        </Kpi>
        <Kpi
          icon={Flame}
          label="7 derniers jours"
          help={HELP.momentum}
          delay={0.12}
          sub={mom ? `${int(mom.last7Volume)} u. contre ${int(mom.prev7Volume)} u.` : undefined}
        >
          <span className={growthColorClass(mom?.growthPercent)}>{formatGrowth(mom?.growthPercent)}</span>
        </Kpi>
        <Kpi icon={Sparkles} label="Créneau d'or" help={HELP.golden} delay={0.16} sub={trends?.goldenSlot ? `${int(trends.goldenSlot.avgVolume)} u. en moyenne` : undefined}>
          <span className="text-base">{trends?.goldenSlot ? `${trends.goldenSlot.day} ${trends.goldenSlot.hour}` : '—'}</span>
        </Kpi>
      </div>

      <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4">
        <div className="mb-3 flex items-center gap-1 text-sm font-semibold text-foreground">
          <Clock className="size-4 text-amber-500 mr-1" />
          Carte de chaleur heure × jour
          <InfoTip text={HELP.heatmap} title="Carte de chaleur" />
        </div>
        {trends ? <Heatmap trends={trends} /> : <p className="py-10 text-center text-xs text-muted-foreground">{isLoading ? 'Chargement…' : 'Aucune donnée.'}</p>}
      </Card>

      <div>
        <div className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">
          Tranches horaires et produits phares
          <InfoTip text={HELP.dayparts} title="Tranches horaires" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {(trends?.dayparts ?? []).map((p, i) => {
            const Icon = DAYPART_ICONS[i] ?? Clock;
            return (
              <motion.div key={p.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}>
                <Card className="h-full border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Icon className="size-4 text-amber-500" />
                      {p.label}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-amber-400">{p.share}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <motion.div className="h-full bg-amber-500" initial={{ width: 0 }} animate={{ width: `${Math.min(p.share, 100)}%` }} transition={{ duration: 0.6, ease: EASE }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{int(p.volume)} unités vendues</p>
                  {p.topProducts.length > 0 ? (
                    <ol className="space-y-1.5">
                      {p.topProducts.map((t, k) => (
                        <li key={t.name} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate text-foreground">
                            <span className="mr-1.5 text-muted-foreground tabular-nums">{k + 1}.</span>
                            {t.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">{t.share}%</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Aucune vente sur cette tranche.</p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <HourlyConsumptionChart data={trends?.hourlyProfile} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 border border-border/80 bg-card/70 backdrop-blur-md p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              Semaine type
              <InfoTip text={HELP.week} title="Semaine type" />
            </span>
            <MetricToggle value={weekMetric} onChange={setWeekMetric} />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={compact} />
                <Tooltip cursor={{ fill: '#f59e0b14' }} content={<ChartTip unit={[weekMetric === 'volume' ? 'u. / jour' : 'F / jour']} />} />
                <Bar dataKey="value" name={weekMetric === 'volume' ? 'Unités' : "Chiffre d'affaires"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-3 border border-border/80 bg-card/70 backdrop-blur-md p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              Évolution jour par jour
              <InfoTip text={HELP.daily} title="Évolution" />
            </span>
            <MetricToggle value={dailyMetric} onChange={setDailyMetric} />
          </div>
          <div className="h-56">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <Tooltip content={<ChartTip unit={[dailyMetric === 'volume' ? 'u.' : 'F']} />} />
                  <Area type="monotone" dataKey="value" name={dailyMetric === 'volume' ? 'Unités' : "Chiffre d'affaires"} stroke="#f59e0b" strokeWidth={2} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{isLoading ? 'Chargement…' : 'Aucune vente observée.'}</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Clock className="size-4 text-amber-500" />
            <span>Créneaux de pointe observés</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {peakHours.length > 0 ? (
              <>
                <strong className="text-foreground">{peakHours.join(', ')}</strong> concentrent{' '}
                <strong className="text-foreground">{trends?.peakHoursShare ?? 0}%</strong> des unités vendues sur la période filtrée.
              </>
            ) : (
              'Données insuffisantes pour identifier des créneaux de pointe.'
            )}
          </p>
        </Card>

        <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Calendar className="size-4 text-amber-500" />
            <span>Effet fin de mois (du 27 au 05)</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {monthEnd && isAvailable(monthEnd.upliftPercent) ? (
              <>
                Moyenne journalière de <strong className="text-foreground">{int(monthEnd.monthEndAvgDailyVolume)} u.</strong> en fin de mois contre{' '}
                {int(monthEnd.otherDaysAvgDailyVolume)} u. le reste du mois, soit <strong className="text-foreground">{formatGrowth(monthEnd.upliftPercent)}</strong> (
                {monthEnd.monthEndDays} et {monthEnd.otherDays} jours observés).
              </>
            ) : (
              'Données insuffisantes pour mesurer un effet fin de mois.'
            )}
          </p>
        </Card>

        <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Flame className="size-4 text-amber-500" />
            <span>Intensité du week-end</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {isAvailable(weekendRatio) ? (
              <>
                Un jour du vendredi au dimanche génère en moyenne <strong className="text-foreground">{weekendRatio}x</strong> le volume d&apos;un jour du lundi au jeudi.
                {busiestDay && busiestDay.avgDailyVolume > 0 && (
                  <>
                    {' '}
                    Jour le plus fort : <strong className="text-foreground">{busiestDay.day}</strong> ({int(busiestDay.avgDailyVolume)} u. / jour en moyenne).
                  </>
                )}
              </>
            ) : (
              'Données insuffisantes pour comparer semaine et week-end.'
            )}
          </p>
        </Card>
      </div>

      {(trends?.monthly?.length ?? 0) > 1 && (
        <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">Mois par mois</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 text-left font-medium">Mois</th>
                  <th className="py-2 text-right font-medium">Unités</th>
                  <th className="py-2 text-right font-medium">Ventes</th>
                  <th className="py-2 text-right font-medium">Chiffre d&apos;affaires</th>
                  <th className="py-2 text-right font-medium">Panier moyen</th>
                </tr>
              </thead>
              <tbody>
                {trends!.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-border/30 last:border-0">
                    <td className="py-2 text-foreground">{monthLabel(m.month)}</td>
                    <td className="py-2 text-right tabular-nums">{int(m.volume)}</td>
                    <td className="py-2 text-right tabular-nums">{int(m.transactions)}</td>
                    <td className="py-2 text-right tabular-nums">{int(m.revenue)} F</td>
                    <td className="py-2 text-right tabular-nums">{m.transactions > 0 ? `${int(m.revenue / m.transactions)} F` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {trends?.methodology && <p className="text-[11px] text-muted-foreground">{trends.methodology}</p>}
    </div>
  );
}

function MetricToggle({ value, onChange }: { value: 'volume' | 'revenue'; onChange: (v: 'volume' | 'revenue') => void }) {
  return (
    <div className="flex rounded-md border border-border/60 p-0.5 text-[11px]">
      {(['volume', 'revenue'] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`rounded px-2 py-0.5 transition-colors ${value === k ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {k === 'volume' ? 'Unités' : 'CA'}
        </button>
      ))}
    </div>
  );
}
