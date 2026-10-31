'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Copy, Eraser, History, MapPinned, Pause, Play, Route, ScanSearch, Warehouse } from 'lucide-react';
import { haversineKm, pathKm, type LngLat } from '@/lib/geo';
import type { GeoTool, MapEstablishment, MapWhiteZone, MapZone } from '@/components/maps/GeoWorldMap';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
const money = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : int(n));

export const GEO_TOOLS: { id: GeoTool; label: string; icon: typeof Clock; hint: string }[] = [
  { id: 'explore', label: 'Explorer', icon: ScanSearch, hint: 'Survolez et cliquez sur les bulles' },
  { id: 'heat', label: 'Heures', icon: Clock, hint: 'Où le marché consomme à chaque heure' },
  { id: 'white', label: 'Zones blanches', icon: MapPinned, hint: 'Établissements inscrits sans ventes' },
  { id: 'depot', label: 'Dépôt & rayons', icon: Warehouse, hint: 'Cliquez sur la carte pour placer un dépôt' },
  { id: 'route', label: 'Tournée', icon: Route, hint: 'Cliquez sur les communes à visiter' },
  { id: 'timeline', label: 'Avant / après', icon: History, hint: 'Glissez entre les deux périodes' },
];

const RADII = [2, 5, 10, 20, 50];
/** Vitesse moyenne de livraison retenue pour l'estimation (km/h, trafic urbain) */
const AVG_SPEED = 25;

interface Props {
  tool: GeoTool;
  zones: MapZone[];
  establishments: MapEstablishment[];
  whiteZones: MapWhiteZone[];
  hour: number;
  setHour: (h: number | ((h: number) => number)) => void;
  blend: number;
  setBlend: (b: number | ((b: number) => number)) => void;
  depot: LngLat | null;
  setDepot: (d: LngLat | null) => void;
  radii: number[];
  setRadii: (r: number[]) => void;
  routeIds: string[];
  setRouteIds: (ids: string[]) => void;
  routeOrder: MapZone[];
  comparisonLabel?: string;
  onFocusZone: (z: { latitude: number; longitude: number; id?: string }) => void;
}

/** Panneau de l'outil actif de la carte Géographie */
export function GeoToolsPanel(p: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={p.tool}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="rounded-xl border border-border/70 bg-card/60 p-3"
      >
        {p.tool === 'explore' && <Explore />}
        {p.tool === 'heat' && <Heat {...p} />}
        {p.tool === 'white' && <White {...p} />}
        {p.tool === 'depot' && <Depot {...p} />}
        {p.tool === 'route' && <RoutePlan {...p} />}
        {p.tool === 'timeline' && <Timeline {...p} />}
      </motion.div>
    </AnimatePresence>
  );
}

function Explore() {
  return (
    <p className="text-xs text-muted-foreground">
      Cliquez sur un pays pour plonger dedans : la carte cadre toutes ses communes et ses maquis, puis choisissez une ville et une commune dans le panneau
      (ou cliquez sur une bulle). Clic droit ou Ctrl + glisser pour faire pivoter, bouton « 3D » pour incliner la carte.
    </p>
  );
}

function usePlayer(active: boolean, onTick: () => void, ms: number) {
  useEffect(() => {
    if (!active) return;
    const t = setInterval(onTick, ms);
    return () => clearInterval(t);
  }, [active, onTick, ms]);
}

function Heat({ zones, hour, setHour, onFocusZone }: Props) {
  const [playing, setPlaying] = useState(false);
  const tick = useMemo(() => () => setHour((h) => (h + 1) % 24), [setHour]);
  usePlayer(playing, tick, 900);
  const withHours = zones.filter((z) => z.hourly?.length === 24);
  const totals = useMemo(() => Array.from({ length: 24 }, (_, h) => withHours.reduce((s, z) => s + (z.hourly?.[h] || 0), 0)), [withHours]);
  const max = Math.max(...totals, 1);
  const top = [...withHours].sort((a, b) => (b.hourly?.[hour] || 0) - (a.hourly?.[hour] || 0)).slice(0, 5);
  const peak = totals.indexOf(Math.max(...totals));

  if (!withHours.length) return <p className="text-xs text-muted-foreground">Les ventes par heure arrivent avec la prochaine mise à jour du serveur.</p>;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((v) => !v)}
            className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 transition-transform active:scale-95"
            aria-label={playing ? 'Pause' : 'Lecture'}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <div className="w-16 font-mono text-lg font-bold tabular-nums">{String(hour).padStart(2, '0')} h</div>
          <input
            type="range"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="flex-1 accent-amber-500"
            aria-label="Heure"
          />
        </div>
        <div className="mt-2 flex h-14 items-end gap-[3px]" aria-hidden>
          {totals.map((v, h) => (
            <button
              key={h}
              onClick={() => setHour(h)}
              className={`flex-1 rounded-t transition-colors ${h === hour ? 'bg-amber-400' : 'bg-slate-700 hover:bg-slate-500'}`}
              style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              title={`${h} h : ${int(v)} unités`}
            />
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Pic du réseau : <b className="text-foreground">{peak} h – {peak + 1} h</b>. Volume cumulé sur la période, à l&apos;heure locale de chaque pays.
        </p>
      </div>
      <div>
        <div className="text-[11px] font-semibold">Les plus actives à {hour} h</div>
        <ul className="mt-1 space-y-1">
          {top.map((z) => (
            <li key={z.id}>
              <button onClick={() => onFocusZone(z)} className="flex w-full justify-between gap-2 rounded px-1.5 py-0.5 text-[11px] hover:bg-muted/60">
                <span className="truncate">{z.zone}</span>
                <span className="font-mono text-muted-foreground">{int(z.hourly?.[hour] || 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function White({ whiteZones, zones, onFocusZone }: Props) {
  const total = whiteZones.reduce((s, w) => s + w.registeredPos, 0);
  // Communes actives où peu d'inscrits vendent
  const lowActivity = zones
    .filter((z) => (z.registeredPos || 0) >= 3 && z.posCount / (z.registeredPos || 1) < 0.5)
    .sort((a, b) => (b.registeredPos || 0) - b.posCount - ((a.registeredPos || 0) - a.posCount))
    .slice(0, 6);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div>
        <div className="text-[11px] font-semibold">
          {whiteZones.length} commune{whiteZones.length > 1 ? 's' : ''} sans vente · {int(total)} établissement{total > 1 ? 's' : ''} inscrit{total > 1 ? 's' : ''}
        </div>
        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto pr-1">
          {whiteZones.slice(0, 30).map((w) => (
            <li key={w.id}>
              <button onClick={() => onFocusZone(w)} className="flex w-full justify-between gap-2 rounded px-1.5 py-0.5 text-[11px] hover:bg-muted/60">
                <span className="truncate">
                  {w.zone} <span className="text-muted-foreground">· {w.city}</span>
                </span>
                <span className="font-mono text-muted-foreground">{w.registeredPos} inscrits</span>
              </button>
            </li>
          ))}
          {!whiteZones.length && <li className="text-[11px] text-muted-foreground">Aucune zone blanche : toutes les communes inscrites vendent.</li>}
        </ul>
      </div>
      <div>
        <div className="text-[11px] font-semibold">Communes où moins de la moitié des inscrits vendent</div>
        <ul className="mt-1 space-y-1">
          {lowActivity.map((z) => (
            <li key={z.id}>
              <button onClick={() => onFocusZone(z)} className="flex w-full justify-between gap-2 rounded px-1.5 py-0.5 text-[11px] hover:bg-muted/60">
                <span className="truncate">{z.zone}</span>
                <span className="font-mono text-muted-foreground">
                  {z.posCount} / {z.registeredPos} actifs
                </span>
              </button>
            </li>
          ))}
          {!lowActivity.length && <li className="text-[11px] text-muted-foreground">Rien à signaler pour ces filtres.</li>}
        </ul>
      </div>
    </div>
  );
}

function Depot({ depot, setDepot, radii, setRadii, zones, establishments }: Props) {
  const rings = useMemo(() => {
    if (!depot) return [];
    return [...radii]
      .sort((a, b) => a - b)
      .map((km) => {
        const ests = establishments.filter((e) => haversineKm(depot, [e.longitude, e.latitude]) <= km);
        const zs = zones.filter((z) => haversineKm(depot, [z.longitude, z.latitude]) <= km);
        return {
          km,
          maquis: ests.length || zs.reduce((s, z) => s + z.posCount, 0),
          communes: zs.length,
          volume: ests.length ? ests.reduce((s, e) => s + e.volume, 0) : zs.reduce((s, z) => s + z.volume, 0),
          revenue: ests.length ? ests.reduce((s, e) => s + e.revenue, 0) : zs.reduce((s, z) => s + (z.revenue || 0), 0),
        };
      });
  }, [depot, radii, zones, establishments]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">{depot ? 'Dépôt placé. Cliquez ailleurs sur la carte pour le déplacer.' : 'Cliquez sur la carte pour placer votre dépôt.'}</span>
        <span className="ml-auto text-muted-foreground">Rayons :</span>
        {RADII.map((km) => {
          const on = radii.includes(km);
          return (
            <button
              key={km}
              onClick={() => setRadii(on ? radii.filter((r) => r !== km) : [...radii, km].slice(-3))}
              className={`rounded-md border px-2 py-0.5 transition-colors ${on ? 'border-amber-500/60 bg-amber-500/15 text-amber-300' : 'border-border/70 text-muted-foreground hover:text-foreground'}`}
            >
              {km} km
            </button>
          );
        })}
        {depot && (
          <button onClick={() => setDepot(null)} className="flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5 text-muted-foreground hover:text-foreground">
            <Eraser className="size-3" /> Retirer
          </button>
        )}
      </div>
      {depot && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {rings.map((r) => (
            <motion.div key={r.km} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE }} className="rounded-lg border border-border/70 bg-background/40 p-2.5">
              <div className="text-xs font-semibold text-amber-400">À moins de {r.km} km</div>
              <div className="mt-1 grid grid-cols-2 gap-x-2 text-[11px]">
                <span className="text-muted-foreground">Maquis</span>
                <span className="text-right font-mono">{int(r.maquis)}</span>
                <span className="text-muted-foreground">Communes</span>
                <span className="text-right font-mono">{int(r.communes)}</span>
                <span className="text-muted-foreground">Volume</span>
                <span className="text-right font-mono">{int(r.volume)}</span>
                <span className="text-muted-foreground">CA</span>
                <span className="text-right font-mono">{money(r.revenue)} F</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">Distances à vol d&apos;oiseau. Les maquis sont comptés d&apos;après leur position anonymisée (quelques centaines de mètres près).</p>
    </div>
  );
}

function RoutePlan({ routeOrder, routeIds, setRouteIds, depot, onFocusZone }: Props) {
  const [copied, setCopied] = useState(false);
  const pts: LngLat[] = [...(depot ? [depot] : []), ...routeOrder.map((z) => [z.longitude, z.latitude] as LngLat)];
  const km = pathKm(pts);
  const minutes = Math.round((km / AVG_SPEED) * 60);
  const copy = () => {
    const lines = [
      'Tournée E-Maquis',
      ...(depot ? ['Départ : dépôt'] : []),
      ...routeOrder.map((z, i) => `${i + 1}. ${z.zone} (${z.city}) · ${z.posCount} maquis`),
      `Distance estimée : ${km.toFixed(1)} km · environ ${Math.floor(minutes / 60)} h ${minutes % 60} min`,
    ];
    navigator.clipboard?.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-muted-foreground">
          Cliquez sur les communes à visiter, l&apos;ordre le plus court est calculé automatiquement{depot ? ' depuis votre dépôt' : ' (placez un dépôt pour partir de chez vous)'}.
        </span>
        {routeIds.length > 0 && (
          <>
            <button onClick={copy} className="ml-auto flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 font-semibold text-slate-950">
              <Copy className="size-3" /> {copied ? 'Copié' : 'Copier (WhatsApp)'}
            </button>
            <button onClick={() => setRouteIds([])} className="flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5 text-muted-foreground hover:text-foreground">
              <Eraser className="size-3" /> Vider
            </button>
          </>
        )}
      </div>
      {routeOrder.length > 0 && (
        <>
          <ol className="flex flex-wrap gap-1.5">
            {routeOrder.map((z, i) => (
              <li key={z.id}>
                <button onClick={() => onFocusZone(z)} className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 py-0.5 pl-0.5 pr-2 text-[11px]">
                  <span className="flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950">{i + 1}</span>
                  {z.zone}
                </button>
              </li>
            ))}
          </ol>
          <div className="text-[11px] text-muted-foreground">
            {routeOrder.length} arrêt{routeOrder.length > 1 ? 's' : ''} · <b className="text-foreground">{km.toFixed(1)} km</b> à vol d&apos;oiseau · environ{' '}
            {Math.floor(minutes / 60)} h {minutes % 60} min de route ({AVG_SPEED} km/h de moyenne) · {int(routeOrder.reduce((s, z) => s + z.posCount, 0))} maquis
          </div>
        </>
      )}
    </div>
  );
}

function Timeline({ blend, setBlend, zones, comparisonLabel }: Props) {
  const [playing, setPlaying] = useState(false);
  const tick = useMemo(() => () => setBlend((b) => (b >= 1 ? 0 : Math.min(1, b + 0.05))), [setBlend]);
  usePlayer(playing, tick, 80);
  const vol = zones.reduce((s, z) => s + (z.growth == null || z.growth <= -100 ? z.volume : z.volume * (1 / (1 + z.growth / 100) + (1 - 1 / (1 + z.growth / 100)) * blend)), 0);
  const up = zones.filter((z) => (z.growth ?? 0) > 0).length;
  const down = zones.filter((z) => (z.growth ?? 0) < 0).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setPlaying((v) => !v)} className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-slate-950 active:scale-95" aria-label={playing ? 'Pause' : 'Lecture'}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <span className="w-28 text-[11px] text-muted-foreground">Période précédente</span>
        <input type="range" min={0} max={100} value={Math.round(blend * 100)} onChange={(e) => setBlend(Number(e.target.value) / 100)} className="flex-1 accent-amber-500" aria-label="Avant / après" />
        <span className="w-24 text-right text-[11px] text-muted-foreground">Période en cours</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Volume affiché : <b className="font-mono text-foreground">{int(vol)}</b>
        </span>
        <span className="text-emerald-400">{up} communes en hausse</span>
        <span className="text-rose-400">{down} en baisse</span>
        {comparisonLabel && <span>{comparisonLabel}</span>}
      </div>
      <p className="text-[10px] text-muted-foreground">La période précédente est reconstituée à partir de l&apos;évolution de chaque commune (communes sans historique : inchangées).</p>
    </div>
  );
}
