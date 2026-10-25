'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown } from 'lucide-react';
import type { DateRange } from '@/types/market';

export const PERIOD_PRESETS: { id: DateRange; label: string; short: string }[] = [
  { id: 'all', label: 'Toutes les dates', short: 'Toutes' },
  { id: 'today', label: "Aujourd'hui", short: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier', short: 'Hier' },
  { id: '7d', label: '7 derniers jours', short: '7 j' },
  { id: '30d', label: '30 derniers jours', short: '30 j' },
  { id: 'mtd', label: 'Ce mois-ci', short: 'Ce mois' },
  { id: 'last_month', label: 'Mois dernier', short: 'Mois dernier' },
  { id: '90d', label: '90 derniers jours', short: '90 j' },
  { id: 'ytd', label: 'Depuis le 1er janvier', short: 'Année en cours' },
  { id: '12m', label: '12 derniers mois', short: '12 mois' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fr = (s?: string) =>
  s ? new Date(`${s}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

/** Libellé lisible de la période active */
export function periodLabel(dateRange?: string, startDate?: string, endDate?: string): string {
  if (dateRange === 'custom') {
    if (!startDate) return 'Personnalisée';
    return endDate && endDate !== startDate ? `${fr(startDate)} → ${fr(endDate)}` : fr(startDate);
  }
  return PERIOD_PRESETS.find((p) => p.id === dateRange)?.label ?? 'Toutes les dates';
}

interface PeriodPickerProps {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  onChange: (next: { dateRange: DateRange; startDate?: string; endDate?: string }) => void;
}

/**
 * Sélecteur de période : préréglages en un clic, ou dates « du … au … » (fin incluse).
 * Les dates sont validées avant application (début ≤ fin, pas dans le futur).
 */
export function PeriodPicker({ dateRange = 'all', startDate, endDate, onChange }: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(startDate || '');
  const [to, setTo] = useState(endDate || '');
  const ref = useRef<HTMLDivElement>(null);
  const today = iso(new Date());

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const valid = !!from && from <= today && (!to || (to >= from && to <= today));
  const apply = () => {
    if (!valid) return;
    onChange({ dateRange: 'custom', startDate: from, endDate: to || from });
    setOpen(false);
  };
  const quick = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 86_400_000);
    setFrom(iso(start));
    setTo(iso(end));
  };

  const active = dateRange !== 'all';
  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => {
          setFrom(startDate || '');
          setTo(endDate || '');
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-8 w-full sm:w-auto items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
          active ? 'border-amber-500/40 bg-amber-500/10 text-amber-500' : 'border-border/80 bg-background/60 text-foreground hover:bg-muted/50'
        }`}
      >
        <Calendar className="size-3.5 shrink-0" />
        <span className="truncate">{periodLabel(dateRange, startDate, endDate)}</span>
        <ChevronDown className={`size-3.5 shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choisir une période"
          className="absolute left-0 top-10 z-[9999] w-[min(92vw,560px)] rounded-xl border border-border bg-popover p-3 shadow-2xl"
        >
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <ul className="flex flex-row flex-wrap gap-1 sm:flex-col sm:gap-0.5">
              {PERIOD_PRESETS.map((p) => {
                const sel = dateRange === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ dateRange: p.id });
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                        sel ? 'bg-amber-500 font-semibold text-black' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>{p.label}</span>
                      {sel && <Check className="size-3.5" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-semibold text-foreground">Période personnalisée</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Du premier au dernier jour inclus.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[11px] text-muted-foreground">
                  Du
                  <input
                    type="date"
                    value={from}
                    max={to || today}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  />
                </label>
                <label className="text-[11px] text-muted-foreground">
                  Au
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    max={today}
                    onChange={(e) => setTo(e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[
                  ['3 j', 3],
                  ['14 j', 14],
                  ['60 j', 60],
                  ['6 mois', 182],
                ].map(([l, d]) => (
                  <button
                    key={l as string}
                    type="button"
                    onClick={() => quick(d as number)}
                    className="rounded-md border border-border/70 px-2 py-1 text-[11px] text-muted-foreground hover:border-amber-500/40 hover:text-foreground"
                  >
                    {l}
                  </button>
                ))}
              </div>
              {from && !valid && <p className="mt-2 text-[11px] text-red-500">Vérifiez les dates : le début doit précéder la fin, sans date future.</p>}
              <button
                type="button"
                disabled={!valid}
                onClick={apply}
                className="mt-3 h-8 w-full rounded-md bg-amber-500 text-xs font-semibold text-black transition-opacity hover:bg-amber-400 disabled:opacity-40"
              >
                Appliquer la période
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
