'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Bot, Download, FileDown, History, Loader2, Search, ShieldAlert, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { fetchAuditLogs, fetchAuditStats, type MarketAuditLogEntry } from '@/api/marketIntelligence.api';
import { marketQueryKeys } from '@/hooks/market/useMarketQueries';
import { downloadBlob } from '@/lib/reports/exportExcel';

const EASE = [0.23, 1, 0.32, 1] as const;
const PAGE = 50;

export const ACTION_LABELS: Record<string, string> = {
  MARKET_DATA_QUERY: 'Consultation',
  MARKET_REPORT_EXPORT: 'Export de rapport',
  MARKET_AI_QUERY: 'Question IA',
  MARKET_PARTNER_CREATE: 'Création distributeur',
  MARKET_PARTNER_UPDATE: 'Modification distributeur',
};
const KIND_LABELS: Record<string, string> = { admin: 'Admin E-Maquis', 'user-admin': 'Compte E-Maquis', partner: 'Distributeur' };
const label = (map: Record<string, string>, k: string) => map[k] ?? k;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

/** Cellule CSV : guillemets échappés, aucune formule exécutable par le tableur */
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** `own` : journal du compte connecté seulement (distributeur), sans statistiques ni filtres de comptes */
export function AuditPanel({ mode = 'admin' }: { mode?: 'admin' | 'own' }) {
  const own = mode === 'own';
  const [days, setDays] = useState(7);
  const [kind, setKind] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const subject = useDeferredValue(search.trim());

  const stats = useQuery({ queryKey: [...marketQueryKeys.all, 'audit-stats', days], queryFn: () => fetchAuditStats(days), staleTime: 30_000, enabled: !own });
  const logs = useInfiniteQuery({
    queryKey: [...marketQueryKeys.auditLogs(), mode, kind, action, subject],
    queryFn: ({ pageParam }) => fetchAuditLogs(own ? { limit: PAGE, action, before: pageParam } : { limit: PAGE, kind, action, subject, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].created_at : undefined),
    staleTime: 15_000,
  });
  const rows: MarketAuditLogEntry[] = useMemo(() => logs.data?.pages.flat() ?? [], [logs.data]);

  const s = stats.data;
  const count = (a: string) => s?.byAction.find((x) => x.action === a)?.count ?? 0;
  const maxAction = Math.max(...(s?.byAction ?? []).map((a) => a.count), 1);

  const exportCsv = () => {
    const head = ['Date', 'Compte', 'Type', 'Action', 'Route', 'Détails', 'Statut'];
    const lines = rows.map((r) =>
      [fmt(r.created_at), r.subject, label(KIND_LABELS, r.kind), label(ACTION_LABELS, r.action), r.endpoint, Object.entries(r.filters || {}).map(([k, v]) => `${k}=${v}`).join(' ; '), r.status].map(csvCell).join(';'),
    );
    downloadBlob(new Blob([`﻿${[head.map(csvCell).join(';'), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Activité (administrateurs) */}
      {!own && (
      <Card className="p-5 border border-border/80 bg-card/70 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold flex items-center gap-2"><Activity className="size-4 text-emerald-400" /> Activité</span>
          <div className="flex rounded-lg border border-border/60 p-0.5 text-[11px]">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`relative px-2.5 py-1 rounded-md ${days === d ? 'text-foreground' : 'text-muted-foreground'}`}>
                {days === d && <motion.span layoutId="audit-days" className="absolute inset-0 rounded-md bg-accent" transition={{ duration: 0.25, ease: EASE }} />}
                <span className="relative">{d} j</span>
              </button>
            ))}
          </div>
        </div>
        {stats.isLoading ? (
          <div className="h-40 rounded-lg bg-muted/20 animate-pulse" />
        ) : stats.isError || !s ? (
          <p className="text-xs text-rose-400">Statistiques indisponibles.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Événements', s.total, History, 'text-orange-400'],
                ['Comptes actifs', s.topSubjects.length, Users, 'text-sky-400'],
                ['Exports', count('MARKET_REPORT_EXPORT'), FileDown, 'text-emerald-400'],
                ['Questions IA', count('MARKET_AI_QUERY'), Bot, 'text-amber-400'],
                ['Refus', s.denied, ShieldAlert, s.denied ? 'text-rose-400' : 'text-muted-foreground'],
              ].map(([l, v, Icon, tone]) => {
                const I = Icon as React.ElementType;
                return (
                  <div key={l as string} className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><I className={`size-3.5 ${tone}`} /> {l as string}</span>
                    <span className="text-xl font-bold tabular-nums"><AnimatedNumber value={v as number} format={(n) => Math.round(n).toLocaleString('fr-FR')} fromZero /></span>
                  </div>
                );
              })}
            </div>
            {s.topSubjects.length === 10 && <p className="text-[10px] text-muted-foreground -mt-2">Comptes actifs : 10 au moins (classement limité aux 10 premiers).</p>}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.byDay} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <defs><linearGradient id="gAudit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [Number(v).toLocaleString('fr-FR'), 'Événements']} labelFormatter={(d) => new Date(String(d)).toLocaleDateString('fr-FR')} />
                    <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#gAudit)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {s.byAction.map((a) => (
                  <button key={a.action} onClick={() => setAction(action === a.action ? '' : a.action)} className={`w-full text-left text-xs rounded-md px-1.5 py-1 ${action === a.action ? 'bg-accent' : 'hover:bg-accent/40'}`}>
                    <div className="flex justify-between mb-1"><span>{label(ACTION_LABELS, a.action)}</span><strong className="tabular-nums">{a.count.toLocaleString('fr-FR')}</strong></div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden"><motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${(a.count / maxAction) * 100}%` }} transition={{ duration: 0.7, ease: EASE }} /></div>
                  </button>
                ))}
              </div>
            </div>
            {s.topSubjects.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Comptes les plus actifs</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.topSubjects.map((t) => (
                    <button key={`${t.kind}-${t.subject}`} onClick={() => setSearch(t.subject)} className="text-[11px] px-2 py-1 rounded-full border border-border hover:bg-accent/40" title={`Dernière activité : ${fmt(t.lastAt)}`}>
                      {t.subject} <span className="text-muted-foreground">· {label(KIND_LABELS, t.kind)} · {t.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      )}

      {/* Journal */}
      <Card className="p-5 border border-border/80 bg-card/70 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold flex items-center gap-2"><History className="size-4 text-emerald-500" /> {own ? 'Mon journal d’activité' : 'Journal des accès'}</span>
          <button onClick={exportCsv} disabled={!rows.length} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-border hover:bg-accent/40 disabled:opacity-40">
            <Download className="size-3.5" /> Exporter ({rows.length}) en CSV
          </button>
        </div>
        {own && <p className="text-[11px] text-muted-foreground">Consultations, exports de rapports et questions à l&apos;agent IA faits avec votre compte.</p>}
        <div className="flex flex-wrap items-center gap-2">
          {!own && (<>
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value.slice(0, 80))} placeholder="Compte (e-mail, identifiant)…" className="h-8 pl-8 text-xs w-56" />
          </div>
          {['', 'admin', 'user-admin', 'partner'].map((k) => (
            <button key={k || 'all'} onClick={() => setKind(k)} className={`text-[11px] px-2.5 py-1 rounded-full border ${kind === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {k ? label(KIND_LABELS, k) : 'Tous les comptes'}
            </button>
          ))}
          </>)}
          {own && ['', 'MARKET_DATA_QUERY', 'MARKET_REPORT_EXPORT', 'MARKET_AI_QUERY'].map((a) => (
            <button key={a || 'all'} onClick={() => setAction(a)} className={`text-[11px] px-2.5 py-1 rounded-full border ${action === a ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {a ? label(ACTION_LABELS, a) : 'Tout'}
            </button>
          ))}
          {!own && action && (
            <button onClick={() => setAction('')} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">{label(ACTION_LABELS, action)} ✕</button>
          )}
        </div>
        {logs.isLoading && <p className="text-xs text-muted-foreground">Chargement du journal…</p>}
        {logs.isError && <p className="text-xs text-rose-400">Journal indisponible.</p>}
        {!logs.isLoading && !logs.isError && rows.length === 0 && <p className="text-xs text-muted-foreground">Aucune entrée pour ces filtres.</p>}
        <div className="divide-y divide-border/50 text-xs max-h-[60vh] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {rows.map((log) => (
              <motion.div key={log._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="min-w-0">
                  <span className="text-muted-foreground">{fmt(log.created_at)}</span> · <strong>{log.subject}</strong>{' '}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/60">{label(KIND_LABELS, log.kind)}</span> · {label(ACTION_LABELS, log.action)} · <span className="font-mono">{log.endpoint}</span>
                  {Object.keys(log.filters || {}).length > 0 && (
                    <span className="text-muted-foreground"> ({Object.entries(log.filters).map(([k, v]) => `${k}=${v}`).join(' · ')})</span>
                  )}
                </span>
                <span className={`font-mono shrink-0 ${log.status === 'AUTHORIZED' ? 'text-emerald-400' : 'text-amber-400'}`}>{log.status === 'AUTHORIZED' ? 'Autorisé' : log.status}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {logs.hasNextPage && (
          <button onClick={() => void logs.fetchNextPage()} disabled={logs.isFetchingNextPage} className="w-full text-xs py-2 rounded-lg border border-border hover:bg-accent/40 flex items-center justify-center gap-2">
            {logs.isFetchingNextPage && <Loader2 className="size-3.5 animate-spin" />} Voir plus
          </button>
        )}
      </Card>
    </div>
  );
}
