'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, Layers, Flame, DollarSign, Activity, PieChart as PieIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Trends } from '@/lib/validations/market.schemas';

export const StockChartPanel: React.FC<{
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  categoriesData?: any;
  /** Tendances réelles (profil horaire calculé par l'API) */
  trendsData?: Pick<Trends, 'hourlyProfile' | 'byHour'>;
}> = ({ selectedCategory, onSelectCategory, categoriesData, trendsData }) => {
  const [activeTab, setActiveTab] = useState<'intraday' | 'categories'>('intraday');

  // Catégories dynamiques récupérées en temps réel depuis la base MongoDB
  const dynamicCategories = useMemo(() => {
    const cats = categoriesData?.categories;
    if (Array.isArray(cats) && cats.length > 0) {
      const palette = ['#fabf45', '#2f00bb', '#ff24d3', '#d17a7a', '#aa0606', '#20d8ff', '#8c3c8c', '#561f1f', '#16d7da', '#f4cb01', '#5cd89d'];
      return cats.map((c: any, idx: number) => {
        const vol = Number(c.volume) || 0;
        const share = Number(c.volumeShare) || Number(c.sharePercent) || 0;
        return {
          name: c.name || c.category || 'Catégorie',
          value: share,
          color: c.color || palette[idx % palette.length],
          volume: vol >= 1000 ? `${(vol / 1000).toFixed(1)}k cols` : `${vol} cols`,
          rawVolume: vol,
        };
      });
    }
    return [];
  }, [categoriesData]);

  // Profil horaire réel : unités vendues en moyenne par jour observé, semaine vs week-end
  const intraday = useMemo(
    () =>
      (trendsData?.hourlyProfile ?? []).map((h) => ({
        time: h.hour,
        weekday: Number(h.weekdayVolume) || 0,
        weekend: Number(h.weekendVolume) || 0,
      })),
    [trendsData],
  );
  const peak = useMemo(() => {
    const rows = trendsData?.byHour ?? [];
    const top = rows.reduce<(typeof rows)[number] | null>((best, r) => (!best || r.volume > best.volume ? r : best), null);
    return top && top.volume > 0 ? top : null;
  }, [trendsData]);
  const hasIntraday = intraday.some((d) => d.weekday > 0 || d.weekend > 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl p-5 shadow-2xl space-y-4">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="size-5 text-emerald-400" />
            Analyse Boursière Intrajournalière & Répartition Catégorielle
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unités vendues en moyenne par jour observé, heure par heure (heure locale de chaque pays), et poids des familles de boissons
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActiveTab('intraday')}
            className={`h-7 px-3 text-xs font-mono rounded-lg transition-all ${
              activeTab === 'intraday'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="size-3.5 mr-1 text-emerald-400" />
            Profil horaire réel
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActiveTab('categories')}
            className={`h-7 px-3 text-xs font-mono rounded-lg transition-all ${
              activeTab === 'categories'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieIcon className="size-3.5 mr-1 text-purple-400" />
            Parts Catégories
          </Button>
        </div>
      </div>

      {/* View 1: Intraday Stock Chart */}
      {activeTab === 'intraday' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="size-2 rounded-full bg-orange-400" /> Lundi - Jeudi
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400" /> Vendredi - Dimanche
              </span>
            </div>
            {peak && (
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                Pic réseau : {peak.hour} ({peak.share}% des unités)
              </Badge>
            )}
          </div>

          <div className="h-[280px] w-full">
            {!hasIntraday ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Aucune vente observée sur ce périmètre.</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={intraday} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeekday" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorWeekend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-mono shadow-2xl space-y-1.5">
                          <div className="font-bold text-foreground border-b border-slate-800 pb-1">Créneau horaire : {label}</div>
                          {payload.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4" style={{ color: entry.color }}>
                              <span>{entry.name} :</span>
                              <span className="font-bold">{Number(entry.value ?? 0).toLocaleString('fr-FR')} u. / jour</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="weekday" name="Lundi - Jeudi" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorWeekday)" />
                <Area type="monotone" dataKey="weekend" name="Vendredi - Dimanche" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWeekend)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* View 2: Categories Breakdown */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-5 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dynamicCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {dynamicCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs font-mono shadow-xl">
                          <div className="font-bold text-foreground">{data.name}</div>
                          <div className="text-emerald-400 font-semibold mt-0.5">
                            {data.value}% ({data.volume})
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="md:col-span-7 space-y-2">
            <div className="text-[11px] font-mono text-slate-400 pb-1">
              POIDS DES FAMILLES DANS LE RÉSEAU MAQUIS (DONNÉES TEMPS RÉEL)
            </div>

            {dynamicCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => onSelectCategory?.(cat.name)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-purple-500/60 bg-purple-500/10 shadow-md ring-1 ring-purple-400'
                      : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-mono text-xs font-semibold text-foreground">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-muted-foreground">{cat.volume}</span>
                    <span className="font-bold text-foreground">{cat.value}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
