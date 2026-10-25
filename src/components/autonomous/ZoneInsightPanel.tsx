'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio, Store, Target, TrendingUp, Wallet } from 'lucide-react';
import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';

interface InsightZone {
  zone: string;
  city: string;
  volume: number;
  revenue: number;
  posCount: number;
  growth?: number | null;
}

interface ZoneInsightPanelProps {
  zones: InsightZone[];
  activeZone?: string;
  unit: DisplayVolumeUnit;
  liveByZone: Record<string, { sales: number; amount: number }>;
  onSelect: (zone: string) => void;
}

const fcfa = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M F` : `${Math.round(n).toLocaleString('fr-FR')} F`);

/**
 * Fiche de la commune choisie (rang, part, débit moyen par maquis comparé au réseau, ventes
 * reçues en direct) et pistes concrètes pour un grossiste :
 * - « Réseau dense, débit faible » : beaucoup de maquis mais peu vendu par maquis (à démarcher) ;
 * - « Meilleur débit par maquis » : zones où chaque point de vente rapporte le plus.
 */
export function ZoneInsightPanel({ zones, activeZone, unit, liveByZone, onSelect }: ZoneInsightPanelProps) {
  const stats = useMemo(() => {
    const totalVolume = zones.reduce((s, z) => s + z.volume, 0);
    const totalRevenue = zones.reduce((s, z) => s + z.revenue, 0);
    const totalPos = zones.reduce((s, z) => s + z.posCount, 0);
    const avgRevenuePerPos = totalPos ? totalRevenue / totalPos : 0;
    const withPos = zones.filter((z) => z.posCount >= 3);
    const sortedPos = [...withPos].map((z) => z.posCount).sort((a, b) => a - b);
    const medianPos = sortedPos[Math.floor(sortedPos.length / 2)] || 0;
    const perPos = (z: InsightZone) => (z.posCount ? z.revenue / z.posCount : 0);
    const underserved = withPos
      .filter((z) => z.posCount >= medianPos && perPos(z) < avgRevenuePerPos)
      .sort((a, b) => b.posCount * (avgRevenuePerPos - perPos(b)) - a.posCount * (avgRevenuePerPos - perPos(a)))
      .slice(0, 3);
    const best = [...withPos].sort((a, b) => perPos(b) - perPos(a)).slice(0, 3);
    return { totalVolume, totalRevenue, avgRevenuePerPos, underserved, best, perPos };
  }, [zones]);

  const idx = zones.findIndex((z) => z.zone.toLowerCase() === activeZone?.toLowerCase());
  const z = idx >= 0 ? zones[idx] : null;
  const live = z ? liveByZone[z.zone.toLowerCase()] : undefined;
  const perPos = z ? stats.perPos(z) : 0;
  const vsNetwork = z && stats.avgRevenuePerPos ? Math.round((perPos / stats.avgRevenuePerPos - 1) * 100) : null;

  return (
    <div className="relative z-20 grid grid-cols-1 lg:grid-cols-5 gap-3 mb-3">
      <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 min-h-[118px]">
        <AnimatePresence mode="wait">
          {z ? (
            <motion.div
              key={z.zone}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{z.zone}</div>
                  <div className="text-[11px] text-slate-400">
                    {z.city} · rang {idx + 1} sur {zones.length}
                  </div>
                </div>
                {live && live.sales > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    <Radio className="size-3 animate-pulse" />
                    {live.sales} vente{live.sales > 1 ? 's' : ''} en direct
                  </span>
                )}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Stat label="Volume" value={formatProductVolume(z.volume, unit, z.zone).formatted} hint={stats.totalVolume ? `${((z.volume / stats.totalVolume) * 100).toFixed(1)} % du réseau` : ''} />
                <Stat label="Chiffre d'affaires" value={fcfa(z.revenue)} hint={stats.totalRevenue ? `${((z.revenue / stats.totalRevenue) * 100).toFixed(1)} % du réseau` : ''} />
                <Stat label="Maquis actifs" value={z.posCount.toLocaleString('fr-FR')} hint="points de vente" />
                <Stat
                  label="CA par maquis"
                  value={fcfa(perPos)}
                  hint={vsNetwork == null ? '' : `${vsNetwork >= 0 ? '+' : ''}${vsNetwork} % vs réseau`}
                  tone={vsNetwork == null ? undefined : vsNetwork >= 0 ? 'up' : 'down'}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center gap-2 text-xs text-slate-400">
              <Target className="size-4 text-amber-400" />
              Cliquez sur une commune (carte, 3D ou classement) pour voir sa fiche.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
        <Leads
          icon={<Store className="size-3.5 text-amber-400" />}
          title="Réseau dense, débit faible"
          hint="Beaucoup de maquis, peu vendu par maquis : zones à démarcher"
          items={stats.underserved.map((x) => ({ name: x.zone, value: `${x.posCount} maquis` }))}
          onSelect={onSelect}
        />
        <Leads
          icon={<Wallet className="size-3.5 text-emerald-400" />}
          title="Meilleur CA par maquis"
          hint="Points de vente les plus rentables"
          items={stats.best.map((x) => ({ name: x.zone, value: fcfa(stats.perPos(x)) }))}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 px-2.5 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-mono font-semibold text-white tabular-nums truncate">{value}</div>
      {hint && (
        <div className={`text-[10px] flex items-center gap-1 ${tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : 'text-slate-500'}`}>
          {tone && <TrendingUp className={`size-3 ${tone === 'down' ? 'rotate-180' : ''}`} />}
          {hint}
        </div>
      )}
    </div>
  );
}

function Leads({
  icon,
  title,
  hint,
  items,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  items: { name: string; value: string }[];
  onSelect: (zone: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5" title={hint}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
        {icon}
        {title}
      </div>
      {items.length ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((it) => (
            <li key={it.name}>
              <button
                onClick={() => onSelect(it.name)}
                className="w-full flex items-center justify-between gap-2 rounded-md px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800/70 transition-colors"
              >
                <span className="truncate">{it.name}</span>
                <span className="font-mono text-slate-400 shrink-0">{it.value}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-1.5 text-[10px] text-slate-500">Pas assez de données pour ces filtres.</div>
      )}
    </div>
  );
}
