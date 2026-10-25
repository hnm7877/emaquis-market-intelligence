'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Trophy } from 'lucide-react';
import { PAYS, normalizeCountry } from '@/constants/countries';
import type { MapZone } from '@/components/maps/GeoWorldMap';

const int = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
const money = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M F` : `${int(n)} F`);
const flagOf = (c: string) => PAYS.find((p) => p.code === normalizeCountry(c))?.flag || '🌍';
const SIDE = ['#f59e0b', '#06b6d4'];

interface Stats {
  country: string;
  volume: number;
  revenue: number;
  pos: number;
  registered: number;
  communes: number;
  perPos: number;
  growth: number | null;
  peakHour: number | null;
  topCommune: string;
}

function statsOf(country: string, zones: MapZone[]): Stats {
  const zs = zones.filter((z) => z.country === country);
  const volume = zs.reduce((s, z) => s + z.volume, 0);
  const revenue = zs.reduce((s, z) => s + (z.revenue || 0), 0);
  const pos = zs.reduce((s, z) => s + z.posCount, 0);
  let gs = 0;
  let gw = 0;
  zs.forEach((z) => {
    if (z.growth != null) {
      gs += z.growth * z.volume;
      gw += z.volume;
    }
  });
  const hours = Array.from({ length: 24 }, (_, h) => zs.reduce((s, z) => s + (z.hourly?.[h] || 0), 0));
  const hmax = Math.max(...hours);
  return {
    country,
    volume,
    revenue,
    pos,
    registered: zs.reduce((s, z) => s + (z.registeredPos || 0), 0),
    communes: zs.length,
    perPos: pos ? revenue / pos : 0,
    growth: gw ? gs / gw : null,
    peakHour: hmax > 0 ? hours.indexOf(hmax) : null,
    topCommune: [...zs].sort((a, b) => b.volume - a.volume)[0]?.zone || '—',
  };
}

/** Deux pays face à face, calculé sur les communes reçues (mêmes filtres que la carte) */
export function CountryCompare({ zones }: { zones: MapZone[] }) {
  const countries = useMemo(() => {
    const m = new Map<string, number>();
    zones.forEach((z) => m.set(z.country, (m.get(z.country) || 0) + (z.revenue || 0)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [zones]);
  const [pick, setPick] = useState<[string | null, string | null]>([null, null]);
  const a = pick[0] && countries.includes(pick[0]) ? pick[0] : countries[0];
  const b = pick[1] && countries.includes(pick[1]) && pick[1] !== a ? pick[1] : countries.find((c) => c !== a);

  if (!a || !b) return <div className="rounded-xl border border-dashed border-border/70 p-10 text-center text-xs text-muted-foreground">Il faut au moins deux pays avec des ventes pour les comparer.</div>;

  const sa = statsOf(a, zones);
  const sb = statsOf(b, zones);
  const rows: { label: string; va: string; vb: string; x: number | null; y: number | null }[] = [
    { label: 'Volume vendu', va: int(sa.volume), vb: int(sb.volume), x: sa.volume, y: sb.volume },
    { label: "Chiffre d'affaires", va: money(sa.revenue), vb: money(sb.revenue), x: sa.revenue, y: sb.revenue },
    { label: 'Maquis actifs', va: int(sa.pos), vb: int(sb.pos), x: sa.pos, y: sb.pos },
    { label: 'CA par maquis', va: money(sa.perPos), vb: money(sb.perPos), x: sa.perPos, y: sb.perPos },
    { label: 'Communes couvertes', va: int(sa.communes), vb: int(sb.communes), x: sa.communes, y: sb.communes },
    { label: 'Inscrits', va: int(sa.registered), vb: int(sb.registered), x: sa.registered, y: sb.registered },
    {
      label: 'Évolution',
      va: sa.growth == null ? 'n/d' : `${sa.growth >= 0 ? '+' : ''}${sa.growth.toFixed(1)} %`,
      vb: sb.growth == null ? 'n/d' : `${sb.growth >= 0 ? '+' : ''}${sb.growth.toFixed(1)} %`,
      x: sa.growth,
      y: sb.growth,
    },
    { label: 'Heure de pointe', va: sa.peakHour == null ? '—' : `${sa.peakHour} h`, vb: sb.peakHour == null ? '—' : `${sb.peakHour} h`, x: null, y: null },
    { label: 'Commune n° 1', va: sa.topCommune, vb: sb.topCommune, x: null, y: null },
  ];
  const score = rows.reduce((s, r) => (r.x == null || r.y == null || r.x === r.y ? s : r.x > r.y ? [s[0] + 1, s[1]] : [s[0], s[1] + 1]), [0, 0]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Picker countries={countries} value={a} other={b} i={0} onChange={(v) => setPick([v, pick[1]])} />
        <button onClick={() => setPick([b, a])} className="rounded-full border border-border/70 p-1.5 text-muted-foreground hover:text-foreground" aria-label="Inverser">
          <ArrowLeftRight className="size-3.5" />
        </button>
        <Picker countries={countries} value={b} other={a} i={1} onChange={(v) => setPick([pick[0], v])} />
      </div>
      <motion.div key={`${a}-${b}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="mt-3 overflow-hidden rounded-xl border border-border/70">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-muted/40 px-3 py-2 text-xs font-semibold">
          <span style={{ color: SIDE[0] }}>{score[0]} pts</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Trophy className="size-3.5 text-amber-400" />
            {score[0] === score[1] ? 'Égalité' : `${score[0] > score[1] ? a : b} mène`}
          </span>
          <span className="text-right" style={{ color: SIDE[1] }}>
            {score[1]} pts
          </span>
        </div>
        {rows.map((r) => {
          const tot = Math.abs(r.x ?? 0) + Math.abs(r.y ?? 0);
          const pa = r.x != null && tot ? (Math.abs(r.x) / tot) * 100 : 50;
          return (
            <div key={r.label} className="border-t border-border/50 px-3 py-2">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[12px]">
                <span className={`font-mono ${r.x != null && r.y != null && r.x > r.y ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{r.va}</span>
                <span className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</span>
                <span className={`text-right font-mono ${r.x != null && r.y != null && r.y > r.x ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{r.vb}</span>
              </div>
              {r.x != null && r.label !== 'Évolution' && (
                <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${pa}%`, background: SIDE[0] }} />
                  <div className="h-full flex-1" style={{ background: SIDE[1] }} />
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function Picker({ countries, value, other, i, onChange }: { countries: string[]; value: string; other: string; i: 0 | 1; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-xl border bg-card/80 px-3 py-2" style={{ borderColor: `${SIDE[i]}80` }}>
      <span className="text-xl">{flagOf(value)}</span>
      <span className="sr-only">Pays</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 cursor-pointer truncate bg-transparent text-sm font-semibold focus:outline-none">
        {countries
          .filter((c) => c !== other)
          .map((c) => (
            <option key={c} value={c} className="bg-slate-950">
              {c}
            </option>
          ))}
      </select>
    </label>
  );
}
