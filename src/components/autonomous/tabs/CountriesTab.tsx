'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Globe2, MapPin, Receipt, Wallet } from 'lucide-react';
import { PAYS, normalizeCountry, flagToIso } from '@/constants/countries';
import { AXIS, ChartTip, Empty, GRID, Panel, Segmented, Skeleton, fmtCompact, fmtFcfa, fmtInt, EASE_OUT } from './ui';

interface Props {
  contextualData?: any;
  geoData?: any;
  selectedCountry: string | string[];
  onSelectCountry: (code: string | string[]) => void;
}

interface CountryRow {
  code: string;
  name: string;
  flag: string;
  transactions: number;
  revenue: number;
}

/**
 * Onglet « Multi-pays » : ventes réelles par pays (filtres contextuels poussés par le
 * serveur), comparaison et filtre en un clic. Les pays sans vente n'apparaissent pas.
 */
export function CountriesTab({ contextualData, geoData, selectedCountry, onSelectCountry }: Props) {
  const [metric, setMetric] = useState<'transactions' | 'revenue'>('transactions');

  const rows: CountryRow[] = useMemo(() => {
    const merged = new Map<string, CountryRow>();
    for (const c of contextualData?.countries || []) {
      const code = normalizeCountry(c.name) || String(c.name);
      const pays = PAYS.find((p) => p.code === code);
      const cur = merged.get(code) || { code, name: (pays?.name || c.name).replace(/_/g, ' '), // Code ISO (CI, BF…) : les drapeaux emoji ne s'affichent pas sous Windows
        flag: pays ? flagToIso(pays.flag) : '', transactions: 0, revenue: 0 };
      cur.transactions += Number(c.count) || 0;
      cur.revenue += Number(c.revenue) || 0;
      merged.set(code, cur);
    }
    return [...merged.values()].sort((x, y) => y.transactions - x.transactions);
  }, [contextualData]);

  const totals = rows.reduce((s, r) => ({ transactions: s.transactions + r.transactions, revenue: s.revenue + r.revenue }), { transactions: 0, revenue: 0 });
  const selected = new Set(Array.isArray(selectedCountry) ? selectedCountry : selectedCountry && selectedCountry !== 'all' ? [selectedCountry] : []);

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    const arr = [...next];
    onSelectCountry(arr.length === 0 ? 'all' : arr.length === 1 ? arr[0] : arr);
  };

  // Villes du/des pays affichés (données géographiques filtrées)
  const cities = useMemo(() => {
    const m = new Map<string, { city: string; country: string; volume: number; revenue: number; pos: number }>();
    for (const z of geoData?.zones || []) {
      const key = `${z.country}|${z.city}`;
      const cur = m.get(key) || { city: z.city, country: z.country, volume: 0, revenue: 0, pos: 0 };
      cur.volume += Number(z.volume) || 0;
      cur.revenue += Number(z.revenue) || 0;
      cur.pos += Number(z.posCount) || 0;
      m.set(key, cur);
    }
    return [...m.values()].sort((x, y) => y.revenue - x.revenue).slice(0, 10);
  }, [geoData]);

  if (!contextualData) return <Skeleton height={420} />;
  if (!rows.length) return <Empty height={300}>Aucune vente par pays sur cette période.</Empty>;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel
        className="xl:col-span-7"
        icon={<Globe2 className="size-4 text-amber-400" />}
        title="Ventes par pays"
        subtitle={`${rows.length} pays actif${rows.length > 1 ? 's' : ''} · ${fmtInt(totals.transactions)} ventes · ${fmtFcfa(totals.revenue)}`}
        actions={<Segmented id="ctry" value={metric} onChange={setMetric} options={[{ id: 'transactions', label: 'Ventes' }, { id: 'revenue', label: 'CA' }]} />}
      >
        <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 42)}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" {...AXIS} tickFormatter={fmtCompact} />
            <YAxis type="category" dataKey="name" {...AXIS} width={120} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <Tooltip content={<ChartTip format={(n) => (metric === 'revenue' ? fmtFcfa(n) : `${fmtInt(n)} ventes`)} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
            <Bar dataKey={metric} name={metric === 'revenue' ? "Chiffre d'affaires" : 'Ventes'} radius={[0, 4, 4, 0]} animationDuration={600} onClick={(d: any) => toggle(d.code)} className="cursor-pointer">
              {rows.map((r) => (
                <Cell key={r.code} fill={selected.size === 0 || selected.has(r.code) ? '#f59e0b' : '#334155'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-1 text-[10px] text-slate-500">Cliquez sur une barre ou une carte pour filtrer toute l&apos;application sur ce pays (plusieurs pays possibles).</p>
      </Panel>

      <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
        {rows.map((r, i) => {
          const on = selected.has(r.code);
          const share = totals.transactions ? (r.transactions / totals.transactions) * 100 : 0;
          return (
            <motion.button
              key={r.code}
              onClick={() => toggle(r.code)}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03, ease: EASE_OUT }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={on}
              className={`rounded-xl border p-3 text-left transition-colors ${on ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'}`}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold tracking-wide text-white">{r.flag || '?'}</span>
                <span className="truncate text-sm font-semibold text-white">{r.name}</span>
                {on && <Check className="ml-auto size-4 text-amber-400" />}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <Mini icon={<Receipt className="size-3" />} label="Ventes" value={fmtInt(r.transactions)} />
                <Mini icon={<Wallet className="size-3" />} label="CA" value={fmtFcfa(r.revenue)} />
                <Mini label="Part" value={`${share.toFixed(1)} %`} />
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700" style={{ width: `${share}%` }} />
              </div>
            </motion.button>
          );
        })}
      </div>

      <Panel
        className="xl:col-span-12"
        icon={<MapPin className="size-4 text-cyan-400" />}
        title="Villes qui rapportent le plus"
        subtitle={selected.size ? 'Pour le ou les pays sélectionnés' : 'Tous pays confondus'}
      >
        {cities.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 font-medium">Ville</th>
                  <th className="py-1.5 font-medium">Pays</th>
                  <th className="py-1.5 text-right font-medium">Maquis</th>
                  <th className="py-1.5 text-right font-medium">CA</th>
                  <th className="py-1.5 text-right font-medium">CA / maquis</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((c) => (
                  <tr key={`${c.country}-${c.city}`} className="border-t border-slate-800/70 text-slate-300">
                    <td className="py-1.5 font-semibold text-white">{c.city}</td>
                    <td className="py-1.5 text-slate-400">{c.country}</td>
                    <td className="py-1.5 text-right font-mono">{fmtInt(c.pos)}</td>
                    <td className="py-1.5 text-right font-mono">{fmtFcfa(c.revenue)}</td>
                    <td className="py-1.5 text-right font-mono text-amber-300">{fmtFcfa(c.pos ? c.revenue / c.pos : 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty height={120} />
        )}
      </Panel>
    </div>
  );
}

function Mini({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="font-mono text-slate-200">{value}</div>
    </div>
  );
}
