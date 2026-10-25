'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Palette des graphiques (ambre = charte E-Maquis) */
export const CHART_COLORS = ['#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16', '#ec4899', '#64748b'];
export const AXIS = { stroke: '#475569', fontSize: 11, tickLine: false, axisLine: false } as const;
export const GRID = { stroke: '#1e293b', strokeDasharray: '3 3', vertical: false } as const;

export const fmtInt = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
export const fmtCompact = (n: number) => {
  const v = Math.abs(n || 0);
  if (v >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (v >= 10_000) return `${(n / 1_000).toFixed(1)} k`;
  return fmtInt(n);
};
export const fmtFcfa = (n: number) => `${fmtCompact(n)} F`;
export const fmtPct = (n: number | null | undefined, digits = 1) => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(digits)} %`);

export function Panel({
  title,
  subtitle,
  icon,
  actions,
  className = '',
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: EASE_OUT }}
      className={`rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg ${className}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            {icon}
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </motion.section>
  );
}

export function Empty({ children = 'Pas encore de données pour ces filtres.', height = 220 }: { children?: React.ReactNode; height?: number }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-500" style={{ height }}>
      {children}
    </div>
  );
}

export function Skeleton({ height = 220 }: { height?: number }) {
  return <div className="animate-pulse rounded-xl bg-slate-900/70" style={{ height }} />;
}

export function Growth({ value, className = '' }: { value?: number | null; className?: string }) {
  if (value == null || !Number.isFinite(value)) return <span className={`text-slate-500 ${className}`}>—</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'} ${className}`}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? '+' : ''}
      {value.toFixed(1)} %
    </span>
  );
}

/** Infobulle commune à tous les graphiques */
export function ChartTip({
  active,
  payload,
  label,
  format = fmtInt,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  format?: (n: number, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-[11px] text-white shadow-xl">
      {label != null && label !== '' && <div className="mb-1 font-semibold">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}</span>
          <span className="ml-auto font-mono">{format(Number(p.value) || 0, p.name)}</span>
        </div>
      ))}
    </div>
  );
}

/** Choix segmenté animé */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5" role="radiogroup">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`relative rounded-md px-2.5 py-1 text-[11px] transition-colors ${on ? 'font-semibold text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {on && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-md bg-amber-500" transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
