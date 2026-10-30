'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownUp,
  BarChart3,
  Beer,
  DollarSign,
  Download,
  Flame,
  Globe,
  Layers,
  Link2,
  MapPin,
  Navigation,
  Search,
  Store,
  Table2,
  TrendingUp,
  X, Globe2 } from 'lucide-react';
import { LocationPrecisionBar } from '@/components/geography/LocationPrecisionBar';
import { GeographicBarChart } from '@/components/charts/GeographicBarChart';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatGrowth, growthColorClass, isAvailable } from '@/utils/metrics';
import { useGeographyQuery } from '@/hooks/market/useMarketQueries';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { PAYS, flagToIso, normalizeCountry } from '@/constants/countries';
import type { GeoMetric, GeoTool, MapWhiteZone, MapZone } from '@/components/maps/GeoWorldMap';
import { GEO_TOOLS, GeoToolsPanel } from '@/components/geography/GeoToolsPanel';
import { CountryCompare } from '@/components/geography/CountryCompare';
import { optimizeRoute, type LngLat } from '@/lib/geo';
import type { FilterState } from '@/types/market';

// Carte chargée seulement côté navigateur (Leaflet a besoin de window)
const GeoWorldMap = dynamic(() => import('@/components/maps/GeoWorldMap').then((m) => m.GeoWorldMap), {
  ssr: false,
  loading: () => <div className="h-[68vh] min-h-[460px] w-full animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />,
});

type Scope = 'all' | 'filters';
type View = 'map' | 'compare' | 'charts' | 'table';
type SortKey = 'volume' | 'revenue' | 'posCount' | 'growth' | 'perPos';

const EASE = [0.23, 1, 0.32, 1] as const;
const ALL_COUNTRIES: Partial<FilterState> = { country: 'all' };
const METRICS: { id: GeoMetric; label: string }[] = [
  { id: 'volume', label: 'Volume' },
  { id: 'revenue', label: 'CA' },
  { id: 'pos', label: 'Maquis' },
  { id: 'growth', label: 'Évolution' },
];

const int = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
const money = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : int(n));
/** Code ISO du pays (CI, BF…) : les drapeaux emoji ne s'affichent pas sous Windows */
const flagOf = (country: string) => {
  const p = PAYS.find((x) => x.code === normalizeCountry(country));
  return p ? flagToIso(p.flag) : '';
};

/** Préférences partagées par lien (aucune donnée sensible : vue, métrique, pays, recherche) */
function readUrl() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const metric = p.get('metric') as GeoMetric | null;
  const view = p.get('view') as View | null;
  return {
    scope: p.get('scope') === 'filters' ? ('filters' as Scope) : undefined,
    metric: metric && METRICS.some((m) => m.id === metric) ? metric : undefined,
    view: view && ['map', 'compare', 'charts', 'table'].includes(view) ? view : undefined,
    country: (p.get('pays') || '').slice(0, 60) || undefined,
    q: (p.get('q') || '').slice(0, 60) || undefined,
  };
}

export default function GeographyPage() {
  const [scope, setScope] = useState<Scope>('all');
  const [view, setView] = useState<View>('map');
  const [tool, setTool] = useState<GeoTool>('explore');
  const [hour, setHour] = useState(21);
  const [blend, setBlend] = useState(1);
  const [depot, setDepot] = useState<LngLat | null>(null);
  const [radii, setRadii] = useState<number[]>([5, 10, 20]);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [metric, setMetric] = useState<GeoMetric>('volume');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapZone | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'volume', dir: -1 });
  const [rows, setRows] = useState(50);
  const [copied, setCopied] = useState(false);

  // Lien partagé : on relit les réglages une fois, après le premier rendu
  useEffect(() => {
    const u = readUrl();
    /* eslint-disable react-hooks/set-state-in-effect -- lecture unique des réglages du lien */
    if (u.scope) setScope(u.scope);
    if (u.metric) setMetric(u.metric);
    if (u.view) setView(u.view);
    if (u.country) setCountry(u.country);
    if (u.q) setSearch(u.q);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // « Tous les pays » : seul le pays est levé, les autres filtres (période, catégorie…) s'appliquent
  const { data: geo, isLoading } = useGeographyQuery(true, scope === 'all' ? ALL_COUNTRIES : undefined);
  const isConnected = useMarketRealtimeStore((s) => s.isConnected);

  const zones: MapZone[] = useMemo(
    () =>
      ((geo?.zones || []) as any[]).map((z) => ({
        id: String(z.id),
        zone: String(z.zone || 'Commune'),
        city: String(z.city || ''),
        country: String(z.country || 'Pays non renseigné'),
        volume: Number(z.volume) || 0,
        revenue: Number(z.revenue) || 0,
        posCount: Number(z.posCount) || 0,
        growth: typeof z.growth === 'number' ? z.growth : null,
        demandIndex: z.demandIndex ?? null,
        latitude: Number(z.latitude),
        longitude: Number(z.longitude),
        hourly: Array.isArray(z.hourly) && z.hourly.length === 24 ? z.hourly.map((v: number) => Number(v) || 0) : undefined,
        registeredPos: typeof z.registeredPos === 'number' ? z.registeredPos : undefined,
      })),
    [geo],
  );
  const establishments = useMemo(() => (geo?.establishments || []) as any[], [geo]);
  const whiteZones: MapWhiteZone[] = useMemo(() => (geo?.whiteZones || []) as MapWhiteZone[], [geo]);

  // Pays présents dans les données
  const countries = useMemo(() => {
    const m = new Map<string, { country: string; volume: number; revenue: number; pos: number; zones: number }>();
    for (const z of zones) {
      const c = m.get(z.country) || { country: z.country, volume: 0, revenue: 0, pos: 0, zones: 0 };
      c.volume += z.volume;
      c.revenue += z.revenue || 0;
      c.pos += z.posCount;
      c.zones += 1;
      m.set(z.country, c);
    }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue);
  }, [zones]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      zones.filter(
        (z) =>
          (!country || z.country === country) &&
          (!q || z.zone.toLowerCase().includes(q) || z.city.toLowerCase().includes(q) || z.country.toLowerCase().includes(q)),
      ),
    [zones, country, q],
  );

  // Tournée : ordre de visite le plus court (depuis le dépôt s'il est placé)
  const routeOrder = useMemo(() => {
    const stops = routeIds.map((id) => zones.find((z) => z.id === id)).filter(Boolean) as MapZone[];
    if (!stops.length) return [];
    const start: LngLat = depot || [stops[0].longitude, stops[0].latitude];
    return optimizeRoute(start, stops.map((z) => [z.longitude, z.latitude])).map((i) => stops[i]);
  }, [routeIds, zones, depot]);
  const routeLine: LngLat[] = useMemo(() => [...(depot ? [depot] : []), ...routeOrder.map((z) => [z.longitude, z.latitude] as LngLat)], [depot, routeOrder]);

  const onSelectZone = useCallback(
    (z: MapZone) => {
      if (tool === 'route') setRouteIds((ids) => (ids.includes(z.id) ? ids.filter((x) => x !== z.id) : [...ids, z.id].slice(0, 25)));
      else setSelected(z);
    },
    [tool],
  );
  const [focus, setFocus] = useState<{ id?: string; latitude: number; longitude: number } | null>(null);

  const totals = useMemo(() => {
    const volume = filtered.reduce((s, z) => s + z.volume, 0);
    const revenue = filtered.reduce((s, z) => s + (z.revenue || 0), 0);
    const pos = filtered.reduce((s, z) => s + z.posCount, 0);
    const top = [...filtered].sort((a, b) => b.volume - a.volume)[0] || null;
    return { volume, revenue, pos, top, perPos: pos ? revenue / pos : 0 };
  }, [filtered]);

  const sorted = useMemo(() => {
    const val = (z: MapZone) => (sort.key === 'perPos' ? (z.posCount ? (z.revenue || 0) / z.posCount : 0) : sort.key === 'growth' ? z.growth ?? -Infinity : (z[sort.key] as number) || 0);
    return [...filtered].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [filtered, sort]);

  const rankOf = useCallback((z: MapZone) => [...filtered].sort((a, b) => b.volume - a.volume).findIndex((x) => x.id === z.id) + 1, [filtered]);

  const shareLink = () => {
    const p = new URLSearchParams();
    if (scope !== 'all') p.set('scope', scope);
    if (metric !== 'volume') p.set('metric', metric);
    if (view !== 'map') p.set('view', view);
    if (country) p.set('pays', country);
    if (q) p.set('q', search.trim());
    const url = `${window.location.origin}${window.location.pathname}${p.toString() ? `?${p}` : ''}`;
    window.history.replaceState(null, '', url);
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    // Protection contre l'injection de formules dans un tableur (= + - @ en début de cellule)
    const cell = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const head = ['Commune', 'Ville', 'Pays', 'Volume', 'CA (FCFA)', 'Maquis', 'CA par maquis', 'Évolution (%)', 'Latitude', 'Longitude'];
    const lines = sorted.map((z) =>
      [z.zone, z.city, z.country, Math.round(z.volume), Math.round(z.revenue || 0), z.posCount, z.posCount ? Math.round((z.revenue || 0) / z.posCount) : 0, z.growth ?? '', z.latitude, z.longitude]
        .map(cell)
        .join(';'),
    );
    const blob = new Blob([`﻿${[head.map(cell).join(';'), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `emaquis-geographie-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sortBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}
      className={`inline-flex items-center gap-1 ${sort.key === key ? 'text-amber-300' : ''}`}
    >
      {label}
      <ArrowDownUp className="size-3 opacity-60" />
    </button>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 pb-12">
      {/* En-tête */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${isConnected ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
              <span className={`size-1.5 rounded-full ${isConnected ? 'animate-pulse bg-amber-400' : 'bg-slate-500'}`} />
              {isConnected ? 'En direct' : 'Reconnexion…'}
            </span>
            <span className="text-slate-500">
              {countries.length} pays · {int(zones.length)} communes · {int(establishments.length)} maquis placés
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-foreground md:text-2xl">
            <MapPin className="size-5 text-amber-500 md:size-6" />
            Géographie du marché
          </h1>
          <p className="text-xs text-muted-foreground">Où se vendent les boissons, dans tous les pays du réseau, de la vue continent jusqu&apos;au maquis.</p>
          {(geo?.unlocated?.posCount ?? 0) > 0 && (
            <p className="mt-1 text-[11px] text-amber-400">
              {geo?.unlocated?.posCount} établissement(s) sans GPS ni adresse ({int(geo?.unlocated?.volume ?? 0)} u.) : comptés à part, non placés sur la carte.
            </p>
          )}
          <LocationPrecisionBar precision={geo?.locationPrecision} unlocated={geo?.unlocated?.posCount ?? 0} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Seg
            id="scope"
            value={scope}
            onChange={(v) => {
              setScope(v);
              setCountry(null);
            }}
            options={[
              { id: 'all', label: 'Tous les pays' },
              { id: 'filters', label: 'Pays du filtre' },
            ]}
          />
          <Seg id="metric" value={metric} onChange={setMetric} options={METRICS} />
          <label className="relative">
            <span className="sr-only">Rechercher une zone</span>
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 60))}
              placeholder="Commune, ville ou pays…"
              className="h-8 w-56 rounded-lg border border-border/70 bg-background/80 pl-8 pr-7 text-xs focus:border-amber-500/60 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Effacer">
                <X className="size-3.5" />
              </button>
            )}
          </label>
          <button onClick={shareLink} className="flex h-8 items-center gap-1.5 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground" title="Copier un lien vers cette vue">
            <Link2 className="size-3.5" />
            {copied ? 'Lien copié' : 'Partager'}
          </button>
        </div>
      </motion.header>

      {/* Indicateurs animés */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi i={0} icon={<Beer className="size-4" />} tone="amber" label="Volume vendu" value={totals.volume} format={int} unit="unités" loading={isLoading} />
        <Kpi i={1} icon={<DollarSign className="size-4" />} tone="violet" label="Chiffre d'affaires" value={totals.revenue} format={money} unit="FCFA" loading={isLoading} />
        <Kpi i={2} icon={<Store className="size-4" />} tone="cyan" label="Maquis actifs" value={totals.pos} format={int} unit={`${filtered.length} communes`} loading={isLoading} />
        <Kpi i={3} icon={<TrendingUp className="size-4" />} tone="emerald" label="CA moyen / maquis" value={totals.perPos} format={money} unit="FCFA" loading={isLoading} />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16, ease: EASE }}
          className="col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Zone championne</span>
            <Flame className="size-4 text-rose-400" />
          </div>
          <div className="mt-1 truncate text-lg font-bold text-foreground">{totals.top?.zone || '—'}</div>
          <div className="truncate text-[11px] text-rose-300">
            {totals.top ? `${flagOf(totals.top.country)} ${totals.top.city} · ${int(totals.top.volume)} u.` : 'en attente des données'}
          </div>
        </motion.div>
      </div>

      {/* Pays du réseau */}
      {countries.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <CountryChip active={!country} onClick={() => setCountry(null)} flag="" name="Tous" sub={`${countries.length} pays`} delay={0} />
          {countries.map((c, i) => {
            const share = totals.revenue && !country ? ((c.revenue / countries.reduce((s, x) => s + x.revenue, 0)) * 100).toFixed(1) : null;
            return (
              <CountryChip
                key={c.country}
                active={country === c.country}
                onClick={() => setCountry(country === c.country ? null : c.country)}
                flag={flagOf(c.country)}
                name={c.country}
                sub={`${int(c.pos)} maquis · ${money(c.revenue)} F${share ? ` · ${share} %` : ''}`}
                delay={(i + 1) * 0.04}
              />
            );
          })}
        </div>
      )}

      {/* Vues */}
      <div className="flex items-center justify-between gap-2">
        <Seg
          id="view"
          value={view}
          onChange={setView}
          options={[
            { id: 'map', label: 'Carte' },
            { id: 'compare', label: 'Pays face à face' },
            { id: 'charts', label: 'Classement' },
            { id: 'table', label: 'Tableau' },
          ]}
        />
        {(q || country) && (
          <span className="text-[11px] text-amber-400">
            {filtered.length} zone{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} className="space-y-4">
          {view === 'map' && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Outils de la carte">
              {GEO_TOOLS.map((t) => {
                const on = tool === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={on}
                    title={t.hint}
                    onClick={() => {
                      setTool(t.id);
                      if (t.id !== 'route') setSelected(null);
                    }}
                    className={`relative flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      on ? 'border-amber-500/60 bg-amber-500/15 font-semibold text-amber-300' : 'border-border/70 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
          {view === 'map' && (
            <GeoToolsPanel
              tool={tool}
              zones={filtered}
              establishments={establishments}
              whiteZones={whiteZones}
              hour={hour}
              setHour={setHour}
              blend={blend}
              setBlend={setBlend}
              depot={depot}
              setDepot={setDepot}
              radii={radii}
              setRadii={setRadii}
              routeIds={routeIds}
              setRouteIds={setRouteIds}
              routeOrder={routeOrder}
              comparisonLabel={geo?.comparisonLabel}
              onFocusZone={(z) => setFocus({ ...z })}
            />
          )}
          {view === 'compare' && <CountryCompare zones={zones} />}
          {view === 'map' && (
            <div className="relative">
              <GeoWorldMap
                zones={filtered}
                establishments={establishments}
                whiteZones={country ? whiteZones.filter((w) => w.country === country) : whiteZones}
                metric={metric}
                tool={tool}
                hour={hour}
                blend={tool === 'timeline' ? blend : 1}
                depot={depot}
                depotRadii={radii}
                route={routeLine}
                routeIds={routeIds}
                focusPoint={focus}
                selectedZoneId={selected?.id}
                focusCountry={country}
                onSelectZone={onSelectZone}
                onSelectCountry={(c) => setCountry(c)}
                onMapClick={(ll) => tool === 'depot' && setDepot(ll)}
              />
              <AnimatePresence>
                {selected && (
                  <motion.aside
                    key={selected.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="absolute bottom-3 right-14 z-[600] w-[min(320px,calc(100%-24px))] rounded-xl border border-slate-700 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{selected.zone}</div>
                        <div className="text-[11px] text-slate-400">
                          {flagOf(selected.country)} {selected.city} · {selected.country} · rang {rankOf(selected)} / {filtered.length}
                        </div>
                      </div>
                      <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white" aria-label="Fermer">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <Fact label="Volume" value={`${int(selected.volume)} u.`} hint={totals.volume ? `${((selected.volume / totals.volume) * 100).toFixed(1)} % de la vue` : ''} />
                      <Fact label="CA" value={`${money(selected.revenue || 0)} F`} />
                      <Fact label="Maquis" value={int(selected.posCount)} />
                      <Fact
                        label="CA / maquis"
                        value={`${money(selected.posCount ? (selected.revenue || 0) / selected.posCount : 0)} F`}
                        hint={
                          totals.perPos && selected.posCount
                            ? `${(((selected.revenue || 0) / selected.posCount / totals.perPos - 1) * 100).toFixed(0)} % vs moyenne`
                            : ''
                        }
                      />
                    </div>
                    <div className={`mt-2 text-[11px] font-semibold ${growthColorClass(selected.growth)}`}>Évolution : {formatGrowth(selected.growth)}</div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          )}

          {view === 'charts' && <GeographicBarChart data={filtered as any} />}

          {(view === 'table' || view === 'map') && (
            <section className="rounded-2xl border border-border/80 bg-card/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Table2 className="size-4 text-amber-500" />
                    Communes ({filtered.length})
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Cliquez sur une ligne pour la voir sur la carte · cliquez sur un titre pour trier</p>
                </div>
                <button onClick={exportCsv} className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400">
                  <Download className="size-3.5" />
                  Exporter (CSV)
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Commune</th>
                      <th className="px-3 py-2">Ville</th>
                      <th className="px-3 py-2">Pays</th>
                      <th className="px-3 py-2 text-right">{sortBtn('volume', 'Volume')}</th>
                      <th className="px-3 py-2 text-right">{sortBtn('revenue', 'CA')}</th>
                      <th className="px-3 py-2 text-right">{sortBtn('posCount', 'Maquis')}</th>
                      <th className="px-3 py-2 text-right">{sortBtn('perPos', 'CA / maquis')}</th>
                      <th className="px-3 py-2 text-right">{sortBtn('growth', 'Évolution')}</th>
                      <th className="px-3 py-2 text-right">Demande</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {sorted.slice(0, rows).map((z, i) => (
                      <tr
                        key={z.id}
                        onClick={() => {
                          setSelected(z);
                          if (view !== 'map') setView('map');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`cursor-pointer transition-colors hover:bg-muted/30 ${selected?.id === z.id ? 'bg-amber-500/10' : ''}`}
                      >
                        <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Navigation className="size-3 shrink-0 text-amber-400" />
                            {z.zone}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{z.city}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {flagOf(z.country)} {z.country}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{int(z.volume)} u.</td>
                        <td className="px-3 py-2 text-right text-violet-400">{money(z.revenue || 0)} F</td>
                        <td className="px-3 py-2 text-right">{int(z.posCount)}</td>
                        <td className="px-3 py-2 text-right text-amber-300">{money(z.posCount ? (z.revenue || 0) / z.posCount : 0)} F</td>
                        <td className={`px-3 py-2 text-right font-medium ${growthColorClass(z.growth)}`}>{formatGrowth(z.growth)}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{isAvailable(z.demandIndex) ? `${z.demandIndex} pts` : 'n/d'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sorted.length > rows && (
                <button onClick={() => setRows((r) => r + 50)} className="mt-3 w-full rounded-lg border border-border/70 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  Afficher 50 de plus ({sorted.length - rows} restantes)
                </button>
              )}
              {!sorted.length && <div className="py-10 text-center text-xs text-muted-foreground">{isLoading ? 'Chargement…' : 'Aucune zone pour ces critères.'}</div>}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Layers className="size-3" />
        <Globe className="size-3" />
        Données agrégées par commune ; les maquis sont anonymisés. <BarChart3 className="size-3" /> Mise à jour en direct par WebSocket.
      </p>
    </div>
  );
}

function Seg<T extends string>({ id, value, onChange, options }: { id: string; value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex h-8 items-center rounded-lg border border-border/70 bg-muted/40 p-0.5" role="radiogroup">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`relative h-full rounded-md px-2.5 text-xs transition-colors ${on ? 'font-semibold text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {on && <motion.span layoutId={`geo-${id}`} className="absolute inset-0 rounded-md bg-amber-500" transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const TONES = {
  amber: 'text-amber-400 bg-amber-500/10',
  violet: 'text-violet-400 bg-violet-500/10',
  cyan: 'text-cyan-400 bg-cyan-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
};

function Kpi({ i, icon, tone, label, value, format, unit, loading }: { i: number; icon: React.ReactNode; tone: keyof typeof TONES; label: string; value: number; format: (n: number) => string; unit: string; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}
      className="rounded-xl border border-border/80 bg-card/60 p-3"
    >
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className={`rounded-lg p-1.5 ${TONES[tone]}`}>{icon}</span>
      </div>
      <div className="mt-1 text-xl font-extrabold text-foreground">
        {loading && !value ? <span className="inline-block h-6 w-24 animate-pulse rounded bg-muted" /> : <AnimatedNumber value={value} format={format} fromZero />}
      </div>
      <div className="text-[11px] text-muted-foreground">{unit}</div>
    </motion.div>
  );
}

function CountryChip({ active, onClick, flag, name, sub, delay }: { active: boolean; onClick: () => void; flag: string; name: string; sub: string; delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: EASE }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
        active ? 'border-amber-500/60 bg-amber-500/10' : 'border-border/70 bg-card/60 hover:border-amber-500/30'
      }`}
    >
      {flag ? (
        <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold tracking-wide">{flag}</span>
      ) : (
        <Globe2 aria-hidden="true" className="size-5 text-amber-400" />
      )}
      <span>
        <span className="block text-xs font-semibold text-foreground">{name}</span>
        <span className="block whitespace-nowrap text-[10px] text-muted-foreground">{sub}</span>
      </span>
    </motion.button>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </div>
  );
}
