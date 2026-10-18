'use client';

import React, { useState } from 'react';
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

const INTRADAY_MARKET_DATA = [
  { time: '12:00', volume: 2400, velocity: 120, bock: 1100, heineken: 800, beaufort: 500 },
  { time: '14:00', volume: 3800, velocity: 190, bock: 1600, heineken: 1200, beaufort: 1000 },
  { time: '16:00', volume: 5200, velocity: 260, bock: 2100, heineken: 1800, beaufort: 1300 },
  { time: '18:00', volume: 11400, velocity: 570, bock: 4800, heineken: 3900, beaufort: 2700 }, // Happy hour starts
  { time: '20:00', volume: 18900, velocity: 945, bock: 7900, heineken: 6400, beaufort: 4600 }, // Peak evening
  { time: '22:00', volume: 22400, velocity: 1120, bock: 9200, heineken: 7800, beaufort: 5400 }, // Ultra peak
  { time: '00:00', volume: 16200, velocity: 810, bock: 6800, heineken: 5700, beaufort: 3700 }, // Night
  { time: '02:00', volume: 8100, velocity: 405, bock: 3400, heineken: 2900, beaufort: 1800 },
];

const CATEGORY_SHARE = [
  { name: 'Bières Blondes & Brunes', value: 68.4, color: '#f97316', volume: '329 800 c' },
  { name: 'Vins & Spiritueux', value: 14.2, color: '#a855f7', volume: '68 450 c' },
  { name: 'Sodas & Gazeuses', value: 9.8, color: '#38bdf8', volume: '47 250 c' },
  { name: 'Boissons Énergisantes', value: 5.1, color: '#10b981', volume: '24 590 c' },
  { name: 'Eaux Minérales & Jus', value: 2.5, color: '#06b6d4', volume: '12 100 c' },
];

export const StockChartPanel: React.FC<{
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}> = ({ selectedCategory = 'Bières Blondes & Brunes', onSelectCategory }) => {
  const [activeTab, setActiveTab] = useState<'intraday' | 'categories'>('intraday');

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
            Vélocité des volumes écoulés par créneau horaire et poids des grandes familles de boissons
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
            Courbe Bourse (Intrajournalier)
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
                <span className="size-2 rounded-full bg-orange-400" /> Bock 65cl
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400" /> Heineken 50cl
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="size-2 rounded-full bg-blue-400" /> Beaufort 50cl
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
              Pic Réseau : 22h00 (22 400 c/h)
            </Badge>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={INTRADAY_MARKET_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHeineken" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorBeaufort" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} fontVariant="mono" />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `${Math.round(val / 1000)}k`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-mono shadow-2xl space-y-1.5">
                          <div className="font-bold text-foreground border-b border-slate-800 pb-1">
                            Créneau Horaire : {label}
                          </div>
                          {payload.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-4" style={{ color: entry.color }}>
                              <span>{entry.name} :</span>
                              <span className="font-bold">{entry.value?.toLocaleString('fr-FR')} c</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="bock" name="Bock 65cl" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorBock)" />
                <Area type="monotone" dataKey="heineken" name="Heineken 50cl" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHeineken)" />
                <Area type="monotone" dataKey="beaufort" name="Beaufort Lager" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorBeaufort)" />
              </AreaChart>
            </ResponsiveContainer>
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
                  data={CATEGORY_SHARE}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CATEGORY_SHARE.map((entry, index) => (
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
              POIDS DES FAMILLES DANS LE RÉSEAU MAQUIS
            </div>

            {CATEGORY_SHARE.map((cat) => {
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
