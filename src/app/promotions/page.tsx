'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Area, AreaChart, Bar as RBar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BadgePercent, Calculator, CalendarClock, Swords, CalendarRange, Coins, Flame, Info, Lightbulb, MapPin, Award, Repeat, Target, TrendingUp, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { InfoTip } from '@/components/ui/InfoTip';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketSessionQuery, usePromotionsQuery, useTrendsQuery } from '@/hooks/market/useMarketQueries';
import { simulatePromotion } from '@/utils/promoSimulator';
import { usePromotionsUiStore, type PromoTab } from '@/stores/usePromotionsUiStore';
import type { PromotionItem, Promotions } from '@/lib/validations/market.schemas';
import { formatGrowth, growthColorClass } from '@/utils/metrics';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.abs(n) >= 10_000 ? `${(n / 1000).toFixed(1)} k` : int(n);
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)} %`;

const HELP = {
  active: 'Promotions actives en ce moment dans les établissements du réseau (prix promo activé sur un produit).',
  uplift: 'Ventes par jour pendant la promotion comparées à la même durée juste avant, même produit, même établissement. La médiane écarte les cas extrêmes.',
  win: 'Part des promotions mesurées qui ont réellement fait vendre plus que la période de référence.',
  discount: 'Remise moyenne accordée par rapport au prix habituel.',
  revenue: 'Ventes supplémentaires dues aux promotions : unités gagnées (pendant − avant) × prix promo.',
  roi: 'Francs de ventes supplémentaires obtenus pour 1 franc de remise accordée. Au-dessus de 1, la remise rapporte plus qu’elle ne coûte en chiffre d’affaires.',
  timeline: 'Promotions lancées et promotions actives chaque semaine (12 dernières semaines).',
  bands: 'Uplift moyen selon la profondeur de la remise : la remise la plus forte n’est pas toujours la plus efficace.',
  rivals: "Pendant une promo, ventes par jour des autres marques de la même catégorie dans la même commune, comparées à juste avant. Négatif = la promo leur prend des ventes.",
  calendar: "Hausse moyenne des ventes selon le jour où la promo démarre, et heures où le réseau vend le plus (page Tendances).",
  simulator: 'Estimation à partir des promotions passées comparables (même marque si au moins 3, sinon toutes marques, remise proche à ±8 points). Ce n’est pas une garantie.',
  ranking: 'Promotions regroupées par marque ou par commune. Cliquez une ligne pour filtrer la liste.',
};

const TABS: { key: PromoTab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'active', label: 'En cours' },
  { key: 'best', label: 'Meilleures' },
  { key: 'worst', label: 'Sans effet' },
];

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

function Kpi({ icon: Icon, label, help, tone = 'text-orange-500', children, sub, delay = 0 }: { icon: React.ElementType; label: string; help: string; tone?: string; children: React.ReactNode; sub?: React.ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <Card className="h-full border border-border/80 bg-card/70 backdrop-blur-md p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Icon className={`size-3.5 ${tone}`} />
          {label}
          <InfoTip text={help} title={label} />
        </div>
        <div className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{children}</div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
      </Card>
    </Reveal>
  );
}

/** Avant / pendant / après en trois barres qui montent */
function SalesBars({ p }: { p: PromotionItem }) {
  const reduce = useReducedMotion();
  const vals = [
    { label: 'Avant', v: p.beforeSalesDaily, cls: 'bg-muted-foreground/40' },
    { label: 'Pendant', v: p.duringSalesDaily, cls: 'bg-orange-500' },
    { label: 'Après', v: p.afterSalesDaily, cls: 'bg-sky-500/70' },
  ];
  const max = Math.max(...vals.map((x) => x.v ?? 0), 0.1);
  return (
    <div className="flex items-end gap-3 h-20">
      {vals.map((x, i) => (
        <div key={x.label} className="flex flex-col items-center justify-end gap-1 h-full w-14">
          <span className="text-[10px] font-mono tabular-nums text-foreground">{x.v == null ? 'n/d' : `${x.v} u/j`}</span>
          <motion.div
            className={`w-8 rounded-t ${x.cls}`}
            initial={{ height: 0 }}
            animate={{ height: `${x.v == null ? 4 : Math.max(4, (x.v / max) * 48)}px` }}
            transition={reduce ? { duration: 0 } : { duration: 0.7, ease: EASE, delay: i * 0.08 }}
          />
          <span className="text-[10px] text-muted-foreground">{x.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Phrases-clés calculées à partir des chiffres (aucune invention : seulement ce que disent les données) */
function buildInsights(data: Promotions, ownBrands: Set<string>): string[] {
  const out: string[] = [];
  const bands = data.discountEffect.filter((b) => b.promotions >= 2 && b.averageUplift != null);
  if (bands.length >= 2) {
    const best = [...bands].sort((a, b) => (b.averageUplift as number) - (a.averageUplift as number))[0];
    out.push(`Les remises « ${best.label} » font le plus vendre : ${signed(best.averageUplift as number)} en moyenne (${best.promotions} promotions).`);
  }
  const brands = data.byBrand.filter((b) => b.measured >= 2 && b.averageUplift != null);
  if (brands.length) {
    const best = [...brands].sort((a, b) => (b.averageUplift as number) - (a.averageUplift as number))[0];
    out.push(`${best.name} obtient le meilleur effet promotionnel : ${signed(best.averageUplift as number)} sur ${best.measured} promotions mesurées.`);
  }
  data.byBrand
    .filter((b) => ownBrands.has(b.name.toLowerCase()) && b.averageUplift != null)
    .forEach((b) => out.push(`Vos promotions ${b.name} : ${signed(b.averageUplift as number)} de ventes en moyenne, ${int(b.extraUnits)} unités gagnées.`));
  const k = data.kpis;
  if (k?.averageRetention != null) {
    out.push(
      k.averageRetention >= 0
        ? `Après la promotion, les ventes restent ${signed(k.averageRetention)} au-dessus d’avant : l’effet dure.`
        : `Après la promotion, les ventes retombent ${signed(k.averageRetention)} sous le niveau d’avant : les clients ont fait des réserves.`,
    );
  }
  return out.slice(0, 4);
}

function Timeline({ data }: { data: Promotions }) {
  if (!data.timeline.some((w) => w.active > 0)) return null;
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3 h-full">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarRange className="size-4 text-orange-400" /> Promotions par semaine <InfoTip text={HELP.timeline} title="Chronologie" />
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.timeline} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="gPromo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.45} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="week" tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelFormatter={(d) => `Semaine du ${new Date(String(d)).toLocaleDateString('fr-FR')}`}
              formatter={(v, n) => [int(Number(v)), n === 'active' ? 'Actives' : 'Lancées']}
            />
            <Area type="monotone" dataKey="active" stroke="#f97316" fill="url(#gPromo)" strokeWidth={2} />
            <Area type="monotone" dataKey="started" stroke="#38bdf8" fill="transparent" strokeWidth={2} strokeDasharray="4 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DiscountEffect({ data }: { data: Promotions }) {
  const rows = data.discountEffect.map((b) => ({ ...b, uplift: b.averageUplift ?? 0 }));
  if (!rows.some((b) => b.promotions > 0)) return null;
  const best = Math.max(...rows.filter((r) => r.promotions > 0).map((r) => r.uplift));
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3 h-full">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BadgePercent className="size-4 text-amber-400" /> Quelle remise fait vendre ? <InfoTip text={HELP.bands} title="Profondeur de remise" />
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(n) => `${n} %`} />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.3} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(v, _n, item) => [`${formatGrowth(Number(v))} · ${(item?.payload as { promotions: number }).promotions} promo(s)`, 'Uplift moyen']}
            />
            <RBar dataKey="uplift" radius={[4, 4, 0, 0]} animationDuration={900}>
              {rows.map((r) => (
                <Cell key={r.key} fill={r.promotions === 0 ? '#52525b' : r.uplift === best ? '#10b981' : r.uplift >= 0 ? '#f59e0b' : '#f43f5e'} />
              ))}
            </RBar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Ranking({ data, ownBrands }: { data: Promotions; ownBrands: Set<string> }) {
  const { groupBy, focus, set } = usePromotionsUiStore();
  const rows = groupBy === 'brand' ? data.byBrand : data.byZone;
  if (!data.byBrand.length && !data.byZone.length) return null;
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.averageUplift ?? 0)), 1);
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Award className="size-4 text-emerald-400" /> Classement des promotions <InfoTip text={HELP.ranking} title="Classement" />
        </div>
        <div className="flex rounded-lg border border-border/60 p-0.5 text-[11px]">
          {(['brand', 'zone'] as const).map((g) => (
            <button key={g} onClick={() => set({ groupBy: g })} className={`relative px-2.5 py-1 rounded-md ${groupBy === g ? 'text-foreground' : 'text-muted-foreground'}`}>
              {groupBy === g && <motion.span layoutId="promo-group" className="absolute inset-0 rounded-md bg-accent" transition={{ duration: 0.25, ease: EASE }} />}
              <span className="relative">{g === 'brand' ? 'Par marque' : 'Par commune'}</span>
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={groupBy} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: EASE }} className="space-y-1.5">
          {rows.map((r) => {
            const own = groupBy === 'brand' && ownBrands.has(r.name.toLowerCase());
            const u = r.averageUplift;
            return (
              <button key={r.name} onClick={() => set({ focus: focus === r.name ? null : r.name })}
                className={`w-full text-left rounded-lg px-2 py-1.5 text-xs transition-colors ${focus === r.name ? 'bg-accent' : 'hover:bg-accent/40'} ${own ? 'ring-1 ring-amber-500/50' : ''}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium truncate">
                    {groupBy === 'brand' ? null : <MapPin className="inline size-3 mr-1 text-muted-foreground" />}
                    {r.name}
                    {own && <span className="ml-1.5 text-[10px] text-amber-500">votre marque</span>}
                    {r.active > 0 && <span className="ml-1.5 text-[10px] text-emerald-400">{r.active} en cours</span>}
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    <strong className={growthColorClass(u)}>{formatGrowth(u)}</strong> · {r.promotions} promo · remise {r.averageDiscount == null ? '—' : `${r.averageDiscount} %`}
                  </span>
                </div>
                {/* Barre centrée : à droite = ventes en hausse, à gauche = en baisse */}
                <div className="relative h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <span className="absolute left-1/2 top-0 h-full w-px bg-foreground/30" />
                  <motion.span
                    className={`absolute top-0 h-full rounded-full ${(u ?? 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(Math.abs(u ?? 0) / maxAbs) * 50}%` }}
                    style={(u ?? 0) >= 0 ? { left: '50%' } : { right: '50%' }}
                    transition={{ duration: 0.7, ease: EASE }}
                  />
                </div>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}

function CompetitorReaction({ data, ownBrands }: { data: Promotions; ownBrands: Set<string> }) {
  const r = data.competitorReaction;
  if (!r || !r.measured) return null;
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3 h-full">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Swords className="size-4 text-rose-400" /> Réaction des concurrents <InfoTip text={HELP.rivals} title="Concurrents" />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-border/60 p-3">
          <span className="text-muted-foreground block">Ventes des concurrents pendant</span>
          <strong className={`text-lg font-mono ${growthColorClass(r.averageCompetitorChange)}`}>{formatGrowth(r.averageCompetitorChange)}</strong>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <span className="text-muted-foreground block">Promos qui leur prennent des ventes</span>
          <strong className="text-lg font-mono">{r.stealRate == null ? '—' : `${r.stealRate} %`}</strong>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        {r.byBrand.map((b) => (
          <div key={b.brand} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${ownBrands.has(b.brand.toLowerCase()) ? 'ring-1 ring-amber-500/50' : ''}`}>
            <span className="font-medium truncate">{b.brand} <span className="text-muted-foreground">({b.promotions})</span></span>
            <span className="tabular-nums shrink-0">
              elle <strong className={growthColorClass(b.ownUplift)}>{formatGrowth(b.ownUplift)}</strong> · concurrents{' '}
              <strong className={growthColorClass(b.competitorChange)}>{formatGrowth(b.competitorChange)}</strong>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Mesuré sur {r.measured} promotion(s) récente(s).</p>
    </Card>
  );
}

function LaunchCalendar({ data }: { data: Promotions }) {
  const { data: trends } = useTrendsQuery();
  const days = data.launchDays;
  if (!days.some((d) => d.promotions > 0)) return null;
  const withData = days.filter((d) => d.promotions > 0 && d.averageUplift != null);
  const best = withData.length ? [...withData].sort((a, b) => (b.averageUplift as number) - (a.averageUplift as number))[0] : null;
  const maxAbs = Math.max(...days.map((d) => Math.abs(d.averageUplift ?? 0)), 1);
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3 h-full">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="size-4 text-sky-400" /> Calendrier conseillé <InfoTip text={HELP.calendar} title="Calendrier" />
      </div>
      <div className="grid grid-cols-7 gap-1.5 items-end h-28">
        {days.map((d, i) => {
          const u = d.averageUplift ?? 0;
          const isBest = best?.day === d.day;
          return (
            <div key={d.day} className="flex flex-col items-center justify-end h-full gap-1">
              <span className={`text-[10px] font-mono ${d.promotions ? growthColorClass(u) : 'text-muted-foreground'}`}>{d.promotions ? formatGrowth(d.averageUplift) : '—'}</span>
              <motion.div
                className={`w-full rounded-t ${isBest ? 'bg-emerald-500' : u >= 0 ? 'bg-sky-500/60' : 'bg-rose-500/60'}`}
                initial={{ height: 0 }}
                animate={{ height: `${d.promotions ? Math.max(4, (Math.abs(u) / maxAbs) * 64) : 2}px` }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.04 }}
              />
              <span className={`text-[10px] ${isBest ? 'text-emerald-400 font-semibold' : 'text-muted-foreground'}`}>{d.day.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
      <div className="text-xs space-y-1">
        {best && (
          <p>
            Lancer le <strong className="text-emerald-400">{best.day.toLowerCase()}</strong> : {signed(best.averageUplift as number)} de ventes en moyenne ({best.promotions} promo(s)).
          </p>
        )}
        {trends?.goldenSlot && (
          <p className="text-muted-foreground">
            Moment où le réseau vend le plus : <strong className="text-foreground">{trends.goldenSlot.day} {trends.goldenSlot.hour}</strong>
            {trends.peakHours.length > 0 && <> · heures fortes {trends.peakHours.slice(0, 3).join(', ')}</>}. Une promo active à ces heures touche le plus de clients.
          </p>
        )}
      </div>
    </Card>
  );
}

function Simulator({ data, ownBrands }: { data: Promotions; ownBrands: Set<string> }) {
  const brands = useMemo(() => [...new Set(data.promotions.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, 'fr')), [data.promotions]);
  const defaultBrand = brands.find((b) => ownBrands.has(b.toLowerCase())) ?? null;
  const [brand, setBrand] = useState<string | null>(defaultBrand);
  const [discount, setDiscount] = useState(15);
  const [duration, setDuration] = useState(7);
  const result = useMemo(() => simulatePromotion(data.promotions, { brand, discountPercent: discount, durationDays: duration }), [data.promotions, brand, discount, duration]);
  return (
    <Card className="border border-primary/30 bg-card/70 backdrop-blur-md p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="size-4 text-orange-400" /> Simulateur de promotion <InfoTip text={HELP.simulator} title="Simulateur" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <label className="space-y-1.5">
          <span className="text-muted-foreground">Marque</span>
          <select value={brand ?? ''} onChange={(e) => setBrand(e.target.value || null)} className="w-full rounded-lg border border-border bg-background px-2 py-1.5">
            <option value="">Toutes marques</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="flex justify-between text-muted-foreground">Remise <strong className="text-foreground">{discount} %</strong></span>
          <input type="range" min={5} max={50} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full accent-orange-500" />
        </label>
        <label className="space-y-1.5">
          <span className="flex justify-between text-muted-foreground">Durée <strong className="text-foreground">{duration} j</strong></span>
          <input type="range" min={1} max={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-orange-500" />
        </label>
      </div>
      {!result ? (
        <p className="text-xs text-muted-foreground">Pas assez de promotions passées avec une remise proche pour estimer. Essayez une autre remise.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Hausse attendue', <span key="u" className={growthColorClass(result.expectedUplift)}><AnimatedNumber value={result.expectedUplift} format={signed} /></span>],
            ['Unités en plus', <AnimatedNumber key="x" value={result.extraUnits} format={int} />],
            ['Ventes en plus', <AnimatedNumber key="r" value={result.extraRevenue} format={(n) => `${compact(n)} F`} />],
            ['Coût de la remise', <AnimatedNumber key="c" value={result.discountCost} format={(n) => `${compact(n)} F`} />],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground block">{label}</span>
              <span className="text-lg font-bold tabular-nums">{value}</span>
            </div>
          ))}
          <p className="col-span-2 md:col-span-4 text-[11px] text-muted-foreground">
            Par point de vente, sur {result.sample} promotion(s) comparable(s) {result.brandSpecific ? `de ${brand}` : 'toutes marques'} · base {result.baselineDaily} u./jour · fiabilité{' '}
            <strong className={result.confidence === 'bonne' ? 'text-emerald-400' : result.confidence === 'moyenne' ? 'text-amber-400' : 'text-rose-400'}>{result.confidence}</strong>.
          </p>
        </div>
      )}
    </Card>
  );
}

function PromotionList({ data }: { data: Promotions }) {
  const { tab, focus, groupBy, set } = usePromotionsUiStore();
  const list = useMemo(() => {
    let rows = data.promotions;
    if (focus) rows = rows.filter((p) => (groupBy === 'brand' ? p.brand : p.zone) === focus);
    if (tab === 'active') rows = rows.filter((p) => p.status === 'ACTIVE');
    if (tab === 'best') rows = rows.filter((p) => p.upliftPercent != null).sort((a, b) => (b.upliftPercent as number) - (a.upliftPercent as number)).slice(0, 15);
    if (tab === 'worst') rows = rows.filter((p) => p.upliftPercent != null && (p.upliftPercent as number) <= 0).sort((a, b) => (a.upliftPercent as number) - (b.upliftPercent as number));
    return rows;
  }, [data.promotions, tab, focus, groupBy]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => set({ tab: t.key })} className={`relative px-3 py-1.5 rounded-lg text-xs ${tab === t.key ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab === t.key && <motion.span layoutId="promo-tab" className="absolute inset-0 rounded-lg bg-accent" transition={{ duration: 0.25, ease: EASE }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
        {focus && (
          <button onClick={() => set({ focus: null })} className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/15 text-primary">
            {focus} <X className="size-3" />
          </button>
        )}
      </div>
      {list.length === 0 && <p className="text-xs text-muted-foreground py-4">Aucune promotion dans cette sélection.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AnimatePresence initial={false}>
          {list.map((p, i) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3, ease: EASE, delay: Math.min(i, 8) * 0.03 }}>
              <Card className="h-full border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground truncate">{p.title}</span>
                      <Badge variant="outline" className="text-[10px]">{p.brand}</Badge>
                      {p.status === 'ACTIVE' ? (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> En cours
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Terminée</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.zone && <>{p.zone} · </>}
                      {p.period}
                      {p.durationDays ? ` (${p.durationDays} j)` : ''}
                    </p>
                    <p className="text-[11px] mt-0.5">
                      {p.promoPrice > 0 && <strong className="text-orange-400">{int(p.promoPrice)} F</strong>}
                      {p.regularPrice > 0 && p.promoPrice > 0 && <span className="text-muted-foreground line-through ml-1.5">{int(p.regularPrice)} F</span>}
                      {p.discountPercent != null && <span className="text-muted-foreground"> (−{p.discountPercent} %)</span>}
                    </p>
                  </div>
                  <span className={`text-lg font-extrabold font-mono shrink-0 ${growthColorClass(p.upliftPercent)}`}>{formatGrowth(p.upliftPercent)}</span>
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-border/50 pt-3">
                  <SalesBars p={p} />
                  <div className="text-right text-[11px] text-muted-foreground">
                    {p.retentionPercent != null && <div>Rémanence <strong className={growthColorClass(p.retentionPercent)}>{formatGrowth(p.retentionPercent)}</strong></div>}
                    <div>Référence : {p.referenceDays} j avant</div>
                    {p.competitorChangePercent != null && (
                      <div>Concurrents <strong className={growthColorClass(p.competitorChangePercent)}>{formatGrowth(p.competitorChangePercent)}</strong></div>
                    )}
                  </div>
                </div>
                {p.startApproximate && (
                  <p className="text-[10px] text-muted-foreground">Début inconnu : uplift non calculé.</p>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const { data, isLoading, isError } = usePromotionsQuery();
  const { data: session } = useMarketSessionQuery();

  useEffect(() => {
    void usePromotionsUiStore.persist.rehydrate();
  }, []);

  const ownBrands = useMemo(() => new Set((session?.brands || []).map((b) => b.toLowerCase())), [session]);
  const insights = useMemo(() => (data ? buildInsights(data, ownBrands) : []), [data, ownBrands]);
  const k = data?.kpis;
  const hasData = !!data && data.promotions.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Flame className="size-5 text-orange-500" /> Promotions &amp; Uplift
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Mesure en cours…' : `${int(k?.activeNow)} promo(s) en cours`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Promotions repérées dans toutes les ventes enregistrées (sans filtre de date) : ventes par jour avant, pendant et après, pour le même produit dans le même établissement. Mis à jour en direct.
          </p>
        </div>
      </div>

      <FilterBar />

      {isError && <p className="text-xs text-rose-400">Impossible de joindre l&apos;API Market Intelligence.</p>}

      {!isLoading && !hasData && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs">
          <Info className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground block text-sm">Aucune promotion à analyser</span>
            <p className="text-muted-foreground mt-1">{data?.dataAvailability?.message ?? 'Aucune promotion ne correspond aux filtres sélectionnés.'}</p>
          </div>
        </div>
      )}

      {hasData && k && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi icon={Flame} label="En cours" help={HELP.active} sub={`${int(k.ended)} terminées · ${int(data.totalPeriods)} au total`}>
              <AnimatedNumber value={k.activeNow} format={int} />
            </Kpi>
            <Kpi icon={TrendingUp} tone="text-emerald-400" label="Uplift moyen" help={HELP.uplift} delay={0.04} sub={`médiane ${formatGrowth(k.medianUplift)} · ${k.measured} mesurées`}>
              <span className={growthColorClass(k.averageUplift)}>{k.averageUplift == null ? '—' : <AnimatedNumber value={k.averageUplift} format={signed} />}</span>
            </Kpi>
            <Kpi icon={Target} tone="text-emerald-400" label="Réussite" help={HELP.win} delay={0.08} sub="promos qui font vendre plus">
              {k.winRate == null ? '—' : <AnimatedNumber value={k.winRate} format={(n) => `${n.toFixed(0)} %`} />}
            </Kpi>
            <Kpi icon={BadgePercent} tone="text-amber-400" label="Remise moyenne" help={HELP.discount} delay={0.12} sub={k.averageRetention == null ? 'rémanence n/d' : `rémanence ${formatGrowth(k.averageRetention)}`}>
              {k.averageDiscount == null ? '—' : `${k.averageDiscount} %`}
            </Kpi>
            <Kpi icon={Coins} label="Ventes gagnées" help={HELP.revenue} delay={0.16} sub={`${int(k.extraUnits)} unités en plus`}>
              <AnimatedNumber value={k.extraRevenue} format={(n) => `${compact(n)} F`} />
            </Kpi>
            <Kpi icon={Repeat} tone="text-sky-400" label="Rendement remise" help={HELP.roi} delay={0.2} sub={`${compact(k.discountCost)} F de remise accordée`}>
              {k.returnOnDiscount == null ? '—' : <span className={k.returnOnDiscount >= 1 ? 'text-emerald-400' : 'text-rose-400'}>× {k.returnOnDiscount}</span>}
            </Kpi>
          </div>

          {insights.length > 0 && (
            <Reveal delay={0.1}>
              <Card className="border border-amber-500/30 bg-amber-500/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-amber-400" /> À retenir</div>
                {insights.map((t, i) => (
                  <motion.p key={t} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE, delay: 0.15 + i * 0.06 }} className="text-xs text-muted-foreground">
                    • {t}
                  </motion.p>
                ))}
              </Card>
            </Reveal>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Reveal delay={0.12}><Timeline data={data} /></Reveal>
            <Reveal delay={0.16}><DiscountEffect data={data} /></Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Reveal delay={0.18}><CompetitorReaction data={data} ownBrands={ownBrands} /></Reveal>
            <Reveal delay={0.2}><LaunchCalendar data={data} /></Reveal>
          </div>

          <Reveal delay={0.2}><Simulator data={data} ownBrands={ownBrands} /></Reveal>

          <Reveal delay={0.2}><Ranking data={data} ownBrands={ownBrands} /></Reveal>
          <Reveal delay={0.24}><PromotionList data={data} /></Reveal>
        </>
      )}

      {data?.methodology && <p className="text-[11px] text-muted-foreground">{data.methodology}</p>}
    </div>
  );
}
