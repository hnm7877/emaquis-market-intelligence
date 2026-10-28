'use client';

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  Boxes,
  Clock,
  Coins,
  Info,
  MapPin,
  PackageX,
  ShieldCheck,
  Snowflake,
  Hourglass,
  Swords,
  Map as MapIcon,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { InfoTip } from '@/components/ui/InfoTip';
import { FilterBar } from '@/components/layout/FilterBar';
import { useMarketSessionQuery, useProductsQuery, useStockIntelligenceQuery } from '@/hooks/market/useMarketQueries';
import { useStockUiStore, type StockFocus } from '@/stores/useStockUiStore';
import type { MarketAlert, ProductItem, StockIntelligence } from '@/lib/validations/market.schemas';
import { formatGrowth } from '@/utils/metrics';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.abs(n) >= 10_000 ? `${(n / 1000).toFixed(1)} k` : int(n);
const dateLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const hoursLabel = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} j` : `${Math.round(h)} h`);

const HELP = {
  availability: 'Part des couples produit × établissement suivis qui ont du stock en ce moment. 100 % = aucun produit en rupture dans le réseau.',
  stockouts: 'Positions (un produit dans un établissement) à zéro maintenant, et nombre de passages à zéro constatés sur la période comparée à la précédente.',
  lost: "Estimation : pour chaque produit en rupture, ce que ce point de vente en vendait par jour sur les 28 derniers jours (60 à défaut). C'est le chiffre d'affaires qui échappe chaque jour tant que la rupture dure.",
  value: "Stock en réserve valorisé au prix d'achat déclaré par les établissements. La part indique combien de positions ont un prix d'achat renseigné.",
  cover: 'Nombre de jours que le stock actuel du réseau peut tenir au rythme de vente des 28 derniers jours.',
  recovery: 'Temps moyen entre un passage à zéro et le réassort suivant, mesuré sur la période.',
  timeline: 'Chaque jour : ruptures constatées (passage à zéro) et réassorts (hausse de stock) dans le réseau.',
  brands: 'Disponibilité par marque (fabricant) : part des positions de la marque qui ont du stock. Cliquez une marque pour filtrer les listes ci-dessous.',
  map: 'Une bulle par commune, placée au centre de ses établissements. Taille = produits suivis, couleur = part en rupture (vert < 5 %, rouge ≥ 20 %).',
  forecast: "Produits encore en stock qui seront épuisés d'ici 3 jours au rythme de vente des 28 derniers jours de chaque point de vente.",
  excluded: "Pour rester fiables, les chiffres ignorent : les établissements sans aucune vente depuis 28 jours (leur stock n'est plus tenu à jour), les produits à zéro que l'établissement n'a pas vendus depuis 60 jours (plus au menu : ce n'est pas une rupture) et les quantités impossibles (erreurs de saisie).",
  competition: 'Disponibilité de chaque marque face aux autres marques de la même catégorie. Le trait vertical = moyenne de la catégorie.',
  zones: 'Communes où la part de produits en rupture est la plus élevée (au moins 5 positions suivies).',
};

// Carte chargée seulement côté navigateur et à la demande (MapLibre est lourd)
const StockoutMap = dynamic(() => import('@/components/stock/StockoutMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted/30" />,
});

const FOCUS_TABS: { key: StockFocus; label: string; icon: React.ElementType }[] = [
  { key: 'forecast', label: 'À venir (3 j)', icon: Hourglass },
  { key: 'ruptures', label: 'Ruptures en cours', icon: PackageX },
  { key: 'lost', label: 'Ventes manquées', icon: Coins },
  { key: 'low', label: 'Sous le seuil', icon: AlertTriangle },
  { key: 'overstock', label: 'Stock dormant', icon: Snowflake },
];

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

function Kpi({ icon: Icon, label, help, tone = 'text-amber-500', children, sub, delay = 0 }: { icon: React.ElementType; label: string; help: string; tone?: string; children: React.ReactNode; sub?: React.ReactNode; delay?: number }) {
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

/** Anneau de disponibilité animé (vert > 95 %, ambre > 85 %, rouge sinon) */
function AvailabilityRing({ value }: { value: number | null | undefined }) {
  const reduce = useReducedMotion();
  const v = value ?? 0;
  const color = v >= 95 ? '#10b981' : v >= 85 ? '#f59e0b' : '#f43f5e';
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90 shrink-0" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth="5" />
        <motion.circle
          cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v / 100) }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE }}
        />
      </svg>
      <span className="text-xl font-bold">{value == null ? '—' : <AnimatedNumber value={v} format={(n) => `${n.toFixed(1)} %`} />}</span>
    </div>
  );
}

/** Barre horizontale qui se remplit à l'apparition et à chaque nouvelle valeur */
function Bar({ pct, className }: { pct: number; className: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${className}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.8, ease: EASE }}
      />
    </div>
  );
}

function Timeline({ data }: { data: StockIntelligence }) {
  const { metric, set } = useStockUiStore();
  const rows = data.timeline;
  if (!rows.length) return null;
  const units = metric === 'units';
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Truck className="size-4 text-sky-400" /> Ruptures et réassorts jour par jour <InfoTip text={HELP.timeline} title="Chronologie" />
        </div>
        <div className="flex rounded-lg border border-border/60 p-0.5 text-[11px]">
          {(['events', 'units'] as const).map((m) => (
            <button key={m} onClick={() => set({ metric: m })} className={`relative px-2.5 py-1 rounded-md ${metric === m ? 'text-foreground' : 'text-muted-foreground'}`}>
              {metric === m && <motion.span layoutId="stock-metric" className="absolute inset-0 rounded-md bg-accent" transition={{ duration: 0.25, ease: EASE }} />}
              <span className="relative">{m === 'events' ? 'Événements' : 'Unités réassorties'}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.45} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
              <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 10 }} minTickGap={24} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} tickFormatter={(n) => compact(Number(n))} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelFormatter={(d) => new Date(String(d)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              formatter={(v, name) => [int(Number(v)), name === 'stockouts' ? 'Ruptures' : name === 'restocks' ? 'Réassorts' : 'Unités réassorties']}
            />
            {units ? (
              <Area type="monotone" dataKey="restockUnits" stroke="#38bdf8" fill="url(#gIn)" strokeWidth={2} />
            ) : (
              <>
                <Area type="monotone" dataKey="restocks" stroke="#38bdf8" fill="url(#gIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="stockouts" stroke="#f43f5e" fill="url(#gOut)" strokeWidth={2} />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function BrandAvailability({ data, ownBrands }: { data: StockIntelligence; ownBrands: Set<string> }) {
  const { brand, set } = useStockUiStore();
  if (!data.brandAvailability.length) return null;
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-emerald-400" /> Disponibilité par marque <InfoTip text={HELP.brands} title="Marques" />
      </div>
      <div className="space-y-2.5">
        {data.brandAvailability.map((b, i) => {
          const selected = brand === b.brand;
          const own = ownBrands.has(b.brand.toLowerCase());
          return (
            <motion.button
              key={b.brand}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: Math.min(i, 10) * 0.03 }}
              onClick={() => set({ brand: selected ? null : b.brand })}
              className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors ${selected ? 'bg-accent' : 'hover:bg-accent/40'} ${own ? 'ring-1 ring-amber-500/50' : ''}`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium truncate">
                  {b.brand}
                  {own && <span className="ml-1.5 text-[10px] text-amber-500">votre marque</span>}
                </span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  <strong className="text-foreground">{b.availabilityRate.toFixed(1)} %</strong> · {b.stockoutPos}/{b.positions} en rupture
                </span>
              </div>
              <Bar pct={b.availabilityRate} className={b.availabilityRate >= 95 ? 'bg-emerald-500' : b.availabilityRate >= 85 ? 'bg-amber-500' : 'bg-rose-500'} />
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}

function ZoneTension({ data }: { data: StockIntelligence }) {
  if (!data.zoneTension.length) return null;
  const max = Math.max(...data.zoneTension.map((z) => z.stockoutRate), 1);
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="size-4 text-rose-400" /> Zones en tension <InfoTip text={HELP.zones} title="Zones" />
      </div>
      <div className="space-y-2.5">
        {data.zoneTension.map((z) => (
          <div key={z.zone} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{z.zone}</span>
              <span className="tabular-nums text-muted-foreground">
                <strong className="text-rose-400">{z.stockoutRate} %</strong> · {z.establishments} établ.
              </span>
            </div>
            <Bar pct={(z.stockoutRate / max) * 100} className="bg-gradient-to-r from-amber-500 to-rose-500" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function StockoutMapCard({ data }: { data: StockIntelligence }) {
  if (!data.stockoutMap.length) return null;
  const worst = [...data.stockoutMap].sort((a, b) => b.stockoutRate - a.stockoutRate)[0];
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MapIcon className="size-4 text-rose-400" /> Carte des ruptures <InfoTip text={HELP.map} title="Carte" />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {[['#10b981', '< 5 %'], ['#f59e0b', '10 %'], ['#f43f5e', '≥ 20 %']].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1"><span className="size-2.5 rounded-full" style={{ background: c }} />{l}</span>
          ))}
        </div>
      </div>
      <div className="h-80 rounded-lg overflow-hidden border border-border/60">
        <StockoutMap zones={data.stockoutMap} />
      </div>
      {worst && (
        <p className="text-xs text-muted-foreground">
          Commune la plus touchée : <strong className="text-foreground">{worst.zone}</strong> ({worst.city}) — {worst.stockoutRate} % des produits suivis en rupture.
        </p>
      )}
    </Card>
  );
}

function CategoryCompetition({ data, ownBrands }: { data: StockIntelligence; ownBrands: Set<string> }) {
  const { category, set } = useStockUiStore();
  const cats = data.categoryCompetition;
  if (!cats.length) return null;
  // Catégorie par défaut : celle où le distributeur a une marque, sinon la plus grande
  const current =
    cats.find((c) => c.category === category) ??
    cats.find((c) => c.brands.some((b) => ownBrands.has(b.brand.toLowerCase()))) ??
    cats[0];
  const leader = [...current.brands].sort((a, b) => b.availabilityRate - a.availabilityRate)[0];
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Swords className="size-4 text-amber-400" /> Face-à-face disponibilité par catégorie <InfoTip text={HELP.competition} title="Concurrence" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <button key={c.category} onClick={() => set({ category: c.category })}
            className={`relative px-2.5 py-1 rounded-full text-[11px] border ${c.category === current.category ? 'text-foreground border-primary/60' : 'text-muted-foreground border-border hover:text-foreground'}`}>
            {c.category === current.category && <motion.span layoutId="stock-cat" className="absolute inset-0 rounded-full bg-primary/15" transition={{ duration: 0.25, ease: EASE }} />}
            <span className="relative">{c.category}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={current.category} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: EASE }} className="space-y-2.5">
          {current.brands.map((b) => {
            const own = ownBrands.has(b.brand.toLowerCase());
            const gap = Math.round((b.availabilityRate - current.categoryAvailability) * 10) / 10;
            return (
              <div key={b.brand} className={`text-xs rounded-lg px-2 py-1.5 ${own ? 'ring-1 ring-amber-500/50 bg-amber-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    {b.brand}
                    {b.brand === leader.brand && <span className="ml-1.5 text-[10px] text-emerald-400">meilleure dispo</span>}
                    {own && <span className="ml-1.5 text-[10px] text-amber-500">votre marque</span>}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    <strong className="text-foreground">{b.availabilityRate.toFixed(1)} %</strong>{' '}
                    <span className={gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}>({gap >= 0 ? '+' : ''}{gap} pt)</span>
                  </span>
                </div>
                <div className="relative">
                  <Bar pct={b.availabilityRate} className={b.availabilityRate >= current.categoryAvailability ? 'bg-emerald-500' : 'bg-rose-500'} />
                  <span className="absolute -top-0.5 h-2.5 w-0.5 bg-foreground/70" style={{ left: `${current.categoryAvailability}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-muted-foreground">Moyenne {current.category} : {current.categoryAvailability.toFixed(1)} % sur {int(current.positions)} positions.</p>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}

function FocusLists({ data }: { data: StockIntelligence }) {
  const { focus, brand, set } = useStockUiStore();
  const byBrand = <T extends { brand: string }>(rows: T[]) => (brand ? rows.filter((r) => r.brand === brand) : rows);
  const counts: Record<StockFocus, number> = {
    forecast: byBrand(data.forecast?.items ?? []).length,
    ruptures: byBrand(data.criticalStockouts).length,
    lost: byBrand(data.lostSales).length,
    low: byBrand(data.lowStockAlerts).length,
    overstock: byBrand(data.overstock).length,
  };

  const rows = (): React.ReactNode[] => {
    switch (focus) {
      case 'forecast':
        return byBrand(data.forecast?.items ?? []).map((s) => (
          <Row key={s.productId ?? s.product} title={s.product} sub={`${s.brand} · ${s.zones.join(', ') || 'Non localisé'}`}>
            <span className="text-right">
              <strong className="text-amber-400 tabular-nums block">{s.positionsAtRisk} POS · dès {s.minDaysLeft < 1 ? "aujourd'hui" : `${Math.ceil(s.minDaysLeft)} j`}</strong>
              <span className="text-[10px] text-muted-foreground">{compact(s.revenueAtRiskPerDay)} F / jour menacés</span>
            </span>
          </Row>
        ));
      case 'ruptures':
        return byBrand(data.criticalStockouts).map((s) => (
          <Row key={s.productId ?? s.product} title={s.product} sub={`${s.brand} · ${s.zones.length ? s.zones.join(', ') : 'Non localisé'}`}>
            <Badge variant="outline" className={s.urgency === 'HIGH' ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-amber-500 text-amber-500 bg-amber-500/10'}>
              {s.affectedPos}/{s.totalPos} POS · {s.stockoutRate} %
            </Badge>
          </Row>
        ));
      case 'lost':
        return byBrand(data.lostSales).map((s) => (
          <Row key={s.productId ?? s.product} title={s.product} sub={`${s.brand} · ${s.affectedPos} point(s) de vente à zéro`}>
            <span className="text-right">
              <strong className="text-rose-400 tabular-nums block">− {compact(s.lostRevenuePerDay)} F / jour</strong>
              <span className="text-[10px] text-muted-foreground">{s.lostUnitsPerDay} u. / jour (estimation)</span>
            </span>
          </Row>
        ));
      case 'low':
        return byBrand(data.lowStockAlerts).map((s) => (
          <Row key={s.productId ?? s.product} title={s.product} sub={s.brand}>
            <span className="text-amber-400 tabular-nums">{s.lowStockPos}/{s.totalPos} POS</span>
          </Row>
        ));
      case 'overstock':
        return byBrand(data.overstock).map((s) => (
          <Row key={s.productId ?? s.product} title={s.product} sub={`${s.brand} · ${int(s.quantity)} u. dans ${s.positions} établ.`}>
            <span className="text-right">
              <strong className="text-sky-400 tabular-nums block">{Math.round(s.daysOfStock)} j de vente</strong>
              {s.stockValue > 0 && <span className="text-[10px] text-muted-foreground">{compact(s.stockValue)} F immobilisés</span>}
            </span>
          </Row>
        ));
    }
  };
  const list = rows();

  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {FOCUS_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => set({ focus: key })} className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${focus === key ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
            {focus === key && <motion.span layoutId="stock-focus" className="absolute inset-0 rounded-lg bg-accent" transition={{ duration: 0.25, ease: EASE }} />}
            <Icon className="relative size-3.5" />
            <span className="relative">{label}</span>
            <span className="relative text-[10px] tabular-nums text-muted-foreground">{counts[key]}</span>
          </button>
        ))}
        {brand && (
          <button onClick={() => set({ brand: null })} className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/15 text-primary">
            {brand} <X className="size-3" />
          </button>
        )}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${focus}|${brand ?? ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: EASE }} className="divide-y divide-border/50 text-xs">
          {list.length ? list : <p className="py-4 text-muted-foreground">Rien à signaler ici sur ce périmètre.</p>}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}

function Row({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="py-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium text-foreground block truncate">{title}</span>
        <span className="text-[10px] text-muted-foreground">{sub}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function StockIntelligencePage() {
  const { data, isLoading } = useStockIntelligenceQuery();
  const { data: session } = useMarketSessionQuery();
  const hasStockLevels = !!data?.dataAvailability?.stockLevels;
  // Sans niveaux de stock synchronisés : repli sur la vélocité estimée à partir des ventes
  const { data: productsData } = useProductsQuery(!isLoading && !hasStockLevels);

  useEffect(() => {
    void useStockUiStore.persist.rehydrate();
  }, []);

  const ownBrands = useMemo(() => new Set((session?.brands || []).map((b) => b.toLowerCase())), [session]);
  const k = data?.kpis;
  const lastSyncAt = data?.stockCoverage?.lastSyncAt ?? null;
  const highVelocity = (productsData?.products ?? [])
    .filter((p: ProductItem) => p.volume > 0 && (p.stockoutRisk === 'HIGH' || p.stockoutRisk === 'MEDIUM'))
    .slice(0, 12);
  const demandSignals = (data?.demandSignals ?? []) as MarketAlert[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Boxes className="size-5 text-orange-500" />
              Stock Intelligence
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Analyse des stocks…' : hasStockLevels ? 'Stock en direct' : 'Estimation par les ventes'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stocks de {int(k?.establishmentsTracked)} établissements actifs ({int(k?.trackedPositions)} produits suivis), mis à jour à chaque vente ou réassort.
            {lastSyncAt ? ` Dernier mouvement : ${new Date(lastSyncAt).toLocaleString('fr-FR')}.` : ''}
          </p>
        </div>
      </div>

      <FilterBar />

      {data?.dataAvailability?.message && !hasStockLevels && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 text-xs">
          <Info className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground block text-sm">Niveaux de stock non disponibles</span>
            <p className="text-muted-foreground mt-1">{data.dataAvailability.message}</p>
          </div>
        </div>
      )}

      {hasStockLevels && k && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi icon={ShieldCheck} tone="text-emerald-400" label="Disponibilité" help={HELP.availability} sub={`${int(k.lowStockPositions)} sous le seuil d'alerte`}>
              <AvailabilityRing value={k.availabilityRate} />
            </Kpi>
            <Kpi icon={PackageX} tone="text-rose-400" label="Ruptures" help={HELP.stockouts} delay={0.04}
              sub={<>{int(k.stockoutEvents)} sur la période <span className={(k.stockoutEventsGrowth ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatGrowth(k.stockoutEventsGrowth)}</span></>}>
              <AnimatedNumber value={k.stockoutPositions} format={int} />
            </Kpi>
            <Kpi icon={Coins} tone="text-rose-400" label="Ventes manquées" help={HELP.lost} delay={0.08} sub={`${k.lostUnitsPerDay} unités / jour`}>
              <AnimatedNumber value={k.lostRevenuePerDay} format={(n) => `${compact(n)} F/j`} />
            </Kpi>
            <Kpi icon={Boxes} label="Valeur en stock" help={HELP.value} delay={0.12} sub={`${int(k.stockUnits)} u. · prix connu ${k.stockValueCoverage} %`}>
              <AnimatedNumber value={k.stockValue} format={(n) => `${compact(n)} F`} />
            </Kpi>
            <Kpi icon={Clock} tone="text-sky-400" label="Couverture" help={HELP.cover} delay={0.16} sub="au rythme de vente actuel">
              {k.networkDaysOfStock == null ? '—' : <AnimatedNumber value={k.networkDaysOfStock} format={(n) => `${n.toFixed(1)} j`} />}
            </Kpi>
            <Kpi icon={Truck} tone="text-sky-400" label="Retour en stock" help={HELP.recovery} delay={0.2} sub={`${int(k.restocks)} réassorts · ${compact(k.restockUnits)} u.`}>
              {k.avgRecoveryHours == null ? '—' : hoursLabel(k.avgRecoveryHours)}
            </Kpi>
          </div>

          {k.excludedPositions && k.excludedPositions.inactiveEstablishment + k.excludedPositions.notCarried + k.excludedPositions.anomalies > 0 && (
            <p className="flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground">
              Écartés des calculs : {int(k.excludedPositions.notCarried)} produits plus vendus (à zéro, ce ne sont pas des ruptures) ·{' '}
              {int(k.excludedPositions.inactiveEstablishment)} positions d&apos;établissements sans vente depuis 28 j · {int(k.excludedPositions.anomalies)} quantités aberrantes
              <InfoTip text={HELP.excluded} title="Positions écartées" />
            </p>
          )}

          {(data.forecast?.positionsAtRisk ?? 0) > 0 && (
            <Reveal delay={0.08}>
              <button onClick={() => useStockUiStore.getState().set({ focus: 'forecast' })}
                className="w-full text-left p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3 text-xs hover:bg-amber-500/15 transition-colors">
                <motion.span animate={{ rotate: [0, 180, 180, 360] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                  <Hourglass className="size-5 text-amber-500" />
                </motion.span>
                <span>
                  <strong className="text-foreground">{int(data.forecast!.positionsAtRisk)} ruptures attendues d&apos;ici {data.forecast!.horizonDays} jours</strong>
                  <span className="text-muted-foreground"> au rythme de vente actuel — voir la liste « À venir ».</span>
                  <InfoTip text={HELP.forecast} title="Prévision" />
                </span>
              </button>
            </Reveal>
          )}

          <Reveal delay={0.1}><Timeline data={data} /></Reveal>

          <Reveal delay={0.12}><StockoutMapCard data={data} /></Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Reveal delay={0.15}><BrandAvailability data={data} ownBrands={ownBrands} /></Reveal>
            <Reveal delay={0.2}><ZoneTension data={data} /></Reveal>
          </div>

          <Reveal delay={0.2}><FocusLists data={data} /></Reveal>

          <Reveal delay={0.22}><CategoryCompetition data={data} ownBrands={ownBrands} /></Reveal>
        </>
      )}

      {/* Signaux de demande */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="size-4 text-amber-500" />
          Signaux de demande ({data?.comparisonLabel || 'période courante vs précédente'})
        </div>
        {demandSignals.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Calcul en cours…' : 'Aucune variation significative (±20 %, au moins 3 points de vente) détectée sur ce périmètre.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {demandSignals.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE, delay: Math.min(i, 8) * 0.04 }}
                className="p-3 rounded-lg border border-border/60 bg-background/50 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {s.variation >= 0 ? <TrendingUp className="size-3.5 text-emerald-400" /> : <TrendingDown className="size-3.5 text-rose-400" />}
                    {s.scope === 'zone' ? s.zone : s.category}
                  </span>
                  <span className={`font-mono font-bold ${s.variation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatGrowth(s.variation)}</span>
                </div>
                <p className="text-muted-foreground">
                  {s.currentVolume?.toLocaleString('fr-FR')} u. contre {s.previousVolume?.toLocaleString('fr-FR')} u. — {s.coveragePos} points de vente, confiance {s.confidence}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Rotation par catégorie */}
      <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-3">
        <div className="text-sm font-semibold text-foreground">Rotation par catégorie (unités / point de vente / semaine)</div>
        {!data?.rotationRankings.length ? (
          <p className="text-xs text-muted-foreground">{isLoading ? 'Calcul en cours…' : 'Aucune vente sur ce périmètre.'}</p>
        ) : (
          <div className="space-y-2.5 text-xs">
            {data.rotationRankings.map((r) => (
              <div key={r.category}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-medium text-foreground">{r.category}</span>
                  <span className="text-muted-foreground tabular-nums">
                    <strong className="text-foreground">{r.rotationRate}</strong> u./POS/sem · {r.activePos} POS
                    {r.daysOfStock !== null && <> · <strong className="text-foreground">{r.daysOfStock}</strong> j de stock</>}
                  </span>
                </div>
                <Bar pct={(r.rotationRate / Math.max(...data.rotationRankings.map((x) => x.rotationRate), 1)) * 100} className="bg-orange-500/80" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {data?.methodology && hasStockLevels && <p className="text-[11px] text-muted-foreground">{data.methodology}</p>}

      {/* Repli sans stock synchronisé : vélocité estimée */}
      {!hasStockLevels && highVelocity.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">Références à forte vélocité (estimation)</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highVelocity.map((p: ProductItem) => (
              <Card key={p.id} className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-2 text-xs">
                <span className="font-bold text-foreground text-sm block">{p.name}</span>
                <span className="text-muted-foreground">{p.brand}{p.format ? ` • ${p.format}` : ''} · {p.rotationRate} u./POS/sem</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
