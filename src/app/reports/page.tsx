'use client';

import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Bot, Check, CheckCircle2, FileDown, FileSpreadsheet, FileText, History, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FilterBar } from '@/components/layout/FilterBar';
import {
  useBrandsQuery,
  useCategoriesQuery,
  useGeographyQuery,
  useMarketOverview,
  useMarketSessionQuery,
  useProductsQuery,
  usePromotionsQuery,
  useStockIntelligenceQuery,
  useTrendsQuery,
} from '@/hooks/market/useMarketQueries';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { ALL_SECTIONS, TEMPLATES, useReportStore, type ReportTemplate } from '@/stores/useReportStore';
import { buildReport, SECTION_LABELS, type ReportSection } from '@/lib/reports/buildReport';
import { downloadBlob, exportReportExcel, fileSlug } from '@/lib/reports/exportExcel';
import { buildQueryParams, logReportExport } from '@/api/marketIntelligence.api';
import { deerflowApi } from '@/api/deerflow.api';
import type { BrandRow, ICategoryItem, IGeographyResponse, IMarketOverview, ProductItem, Trends } from '@/lib/validations/market.schemas';

const EASE = [0.23, 1, 0.32, 1] as const;

const FILTER_LABELS: Record<string, string> = {
  dateRange: 'Période', startDate: 'Du', endDate: 'Au', country: 'Pays', city: 'Ville', commune: 'Commune',
  category: 'Catégorie', brand: 'Marque', posType: 'Type', status: 'Statut',
};

/** Barres simples (imprimables, aucune librairie) */
function MiniBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-24 mt-2">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <motion.div
            className="w-full rounded-t bg-orange-500/80 print:bg-orange-500"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(2, (d.value / max) * 80)}px` }}
            transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 20) * 0.02 }}
          />
          {data.length <= 12 && <span className="mt-1 text-[8px] text-zinc-500 truncate max-w-full">{d.label}</span>}
        </div>
      ))}
    </div>
  );
}

const cell = (v: string | number | null) =>
  v == null ? '—' : typeof v === 'number' ? v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : v;

function SectionView({ s, index }: { s: ReportSection; index: number }) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="space-y-3 break-inside-avoid"
    >
      <h2 className="text-sm font-bold text-zinc-900 border-b-2 border-orange-500 pb-1">
        {index + 1}. {s.title}
      </h2>
      {s.kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {s.kpis.map((k) => (
            <div key={k.label} className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-wide text-zinc-500">{k.label}</div>
              <div className="text-sm font-bold text-zinc-900 tabular-nums">{k.value}</div>
              {k.hint && k.hint !== '—' && <div className="text-[9px] text-zinc-500">{k.hint}</div>}
            </div>
          ))}
        </div>
      )}
      {s.highlights.length > 0 && (
        <ul className="space-y-1 text-[11px] text-zinc-700">
          {s.highlights.map((h) => (
            <li key={h} className="flex gap-1.5"><span className="text-orange-500">▸</span>{h}</li>
          ))}
        </ul>
      )}
      {s.chart && s.chart.length > 1 && <MiniBars data={s.chart} />}
      {s.table && s.table.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-zinc-800">
            <thead>
              <tr className="bg-zinc-100 text-zinc-600">
                {s.table.columns.map((c, i) => <th key={c} className={`px-2 py-1 font-semibold ${i ? 'text-right' : 'text-left'}`}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((r, ri) => (
                <tr key={ri} className={`border-b border-zinc-100 ${s.table?.highlight?.[ri] ? 'bg-orange-50 font-semibold' : ''}`}>
                  {r.map((v, ci) => <td key={ci} className={`px-2 py-1 tabular-nums ${ci ? 'text-right' : ''}`}>{cell(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

export default function ReportsPage() {
  const store = useReportStore();
  const { template, title, recipient, sections, history } = store;
  const filters = useMarketFilterStore((s) => s.filters);
  const { data: session, isPartner } = useMarketSessionQuery();
  const ownBrands = useMemo(() => session?.brands ?? [], [session]);

  useEffect(() => {
    void useReportStore.persist.rehydrate();
  }, []);

  // Seules les données des sections cochées sont demandées (WebSocket, cache partagé avec les autres pages)
  const on = (id: (typeof ALL_SECTIONS)[number]) => sections.includes(id);
  const overview = useMarketOverview(on('overview'));
  const brands = useBrandsQuery(on('brands'));
  const categories = useCategoriesQuery(on('categories'));
  const products = useProductsQuery(on('products'));
  const geography = useGeographyQuery(on('geography'));
  const trends = useTrendsQuery(on('trends'));
  const stock = useStockIntelligenceQuery(on('stock'));
  const promotions = usePromotionsQuery(on('promotions'));
  const queries = [overview, brands, categories, products, geography, trends, stock, promotions];
  const loading = queries.some((q) => q.isLoading && q.fetchStatus !== 'idle');

  const report = useMemo(
    () =>
      buildReport(
        {
          overview: overview.data as IMarketOverview | undefined,
          brands: (brands.data as { brands?: BrandRow[] } | undefined)?.brands,
          categories: (categories.data as { categories?: ICategoryItem[] } | undefined)?.categories,
          products: (products.data as { products?: ProductItem[] } | undefined)?.products,
          geography: geography.data as IGeographyResponse | undefined,
          trends: trends.data as Trends | undefined,
          stock: stock.data,
          promotions: promotions.data,
        },
        sections,
        ownBrands,
      ),
    [overview.data, brands.data, categories.data, products.data, geography.data, trends.data, stock.data, promotions.data, sections, ownBrands],
  );

  const filterLines = useMemo(
    () =>
      Object.entries(buildQueryParams(filters))
        .filter(([, v]) => v && v !== 'all')
        .map(([k, v]) => `${FILTER_LABELS[k] ?? k} : ${v}`),
    [filters],
  );
  // Date de génération lue côté navigateur uniquement (évite un écart entre rendu serveur et navigateur)
  const [generatedAt, setGeneratedAt] = React.useState('');
  useEffect(() => {
    const tick = () => setGeneratedAt(new Date().toLocaleString('fr-FR'));
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  const meta = [
    recipient ? `Destinataire : ${recipient}` : '',
    generatedAt ? `Généré le ${generatedAt} — données réelles du réseau E-Maquis` : 'Données réelles du réseau E-Maquis',
    filterLines.length ? `Filtres : ${filterLines.join(' · ')}` : 'Filtres : aucun (tout le réseau)',
  ].filter(Boolean);

  const track = (format: 'pdf' | 'xlsx') => {
    void logReportExport({ format, sections: report.map((s) => s.id), filters: buildQueryParams(filters) });
    store.remember({ at: new Date().toISOString(), title, format, sections });
  };

  const excel = useMutation({
    mutationFn: async () => {
      const blob = await exportReportExcel(title, meta, report);
      downloadBlob(blob, `${fileSlug(title)}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      track('xlsx');
    },
  });

  const printPdf = () => {
    track('pdf');
    window.print();
  };

  // Commentaire IA : DeerFlow reçoit uniquement les chiffres et constats du rapport. En cas d'échec : message clair, jamais de texte inventé.
  const ai = useMutation({
    mutationFn: async () => {
      const facts = report
        .map((s) => `## ${s.title}\n${s.kpis.map((k) => `- ${k.label} : ${k.value}`).join('\n')}\n${s.highlights.map((h) => `- ${h}`).join('\n')}`)
        .join('\n\n');
      // Le serveur ajoute aussi les chiffres réels du périmètre ; la consigne interdit d'inventer
      const res = await deerflowApi.chat(
        `Rédige en français un commentaire exécutif de 6 à 10 lignes pour ${recipient || 'un distributeur de boissons'}, à partir UNIQUEMENT des chiffres ci-dessous (n'invente aucun chiffre). Termine par 3 recommandations concrètes.\n\n${facts}`,
      );
      if (!res?.reply) throw new Error('Réponse vide');
      return res.reply as string;
    },
  });
  useEffect(() => ai.reset(), [report.length, sections.join(','), filters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Rapport imprimé en A4 portrait */}
      <style>{'@media print { @page { size: A4 portrait; margin: 12mm; } html, body, main { background: #fff !important; } }'}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60 print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-orange-500" /> Générateur de rapports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rapport construit en direct à partir des données réelles et des filtres choisis. Export PDF ou Excel, chaque export est tracé.
          </p>
        </div>
      </div>

      <div className="print:hidden"><FilterBar /></div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start print:block">
        {/* Paramètres */}
        <div className="space-y-4 lg:sticky lg:top-4 print:hidden">
          <Card className="p-4 border border-border/80 bg-card/70 space-y-3">
            <p className="text-xs font-semibold">Modèle</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TEMPLATES) as ReportTemplate[]).map((t) => (
                <button key={t} onClick={() => store.applyTemplate(t)}
                  className={`relative text-left rounded-lg border p-2.5 text-xs transition-colors ${template === t ? 'border-primary/70' : 'border-border hover:bg-accent/40'}`}>
                  {template === t && <motion.span layoutId="report-template" className="absolute inset-0 rounded-lg bg-primary/10" transition={{ duration: 0.25, ease: EASE }} />}
                  <span className="relative font-semibold block">{TEMPLATES[t].label}</span>
                  <span className="relative text-[10px] text-muted-foreground">{TEMPLATES[t].description}</span>
                </button>
              ))}
            </div>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Titre</span>
              <Input value={title} onChange={(e) => store.set({ title: e.target.value })} className="h-8 text-xs" />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Destinataire (facultatif)</span>
              <Input value={recipient} placeholder={isPartner ? session?.company : 'Nom du partenaire'} onChange={(e) => store.set({ recipient: e.target.value })} className="h-8 text-xs" />
            </label>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Sections</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SECTIONS.map((id) => (
                  <button key={id} onClick={() => store.toggleSection(id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${sections.includes(id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {sections.includes(id) && <Check className="inline size-3 mr-1" />}
                    {SECTION_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>
            {ownBrands.length > 0 && <p className="text-[11px] text-amber-500">Vos marques ({ownBrands.join(', ')}) sont mises en avant dans le rapport.</p>}
          </Card>

          <Card className="p-4 border border-border/80 bg-card/70 space-y-2">
            <button onClick={printPdf} disabled={!report.length || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold h-10 disabled:opacity-50">
              <FileText className="size-4" /> Exporter en PDF
            </button>
            <button onClick={() => excel.mutate()} disabled={!report.length || loading || excel.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 text-emerald-500 text-xs font-semibold h-10 hover:bg-emerald-500/10 disabled:opacity-50">
              {excel.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} Exporter en Excel
            </button>
            {excel.isError && <p className="text-[11px] text-rose-400">Export Excel impossible, réessayez.</p>}
            <button onClick={() => ai.mutate()} disabled={!report.length || loading || ai.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border text-xs h-9 hover:bg-accent/40 disabled:opacity-50">
              {ai.isPending ? <Sparkles className="size-4 animate-spin text-amber-500" /> : <Bot className="size-4 text-amber-500" />}
              {ai.isPending ? 'Rédaction du commentaire…' : 'Ajouter un commentaire IA'}
            </button>
          </Card>

          {history.length > 0 && (
            <Card className="p-4 border border-border/80 bg-card/70 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5"><History className="size-3.5" /> Derniers exports</p>
              {history.map((h) => (
                <div key={h.at} className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">{h.title}</span>
                  <span className="shrink-0 ml-2">{h.format.toUpperCase()} · {new Date(h.at).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Aperçu = document imprimé */}
        <div className="rounded-xl bg-white text-zinc-900 shadow-2xl ring-1 ring-black/5 p-6 sm:p-8 space-y-6 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-orange-600">E-Maquis Market Intelligence</div>
              <h1 className="text-xl font-extrabold text-zinc-900 mt-1">{title || 'Rapport de marché'}</h1>
              {meta.map((m) => <p key={m} className="text-[10px] text-zinc-500">{m}</p>)}
            </div>
            <div className="size-10 shrink-0 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black flex items-center justify-center">EM</div>
          </header>

          {loading && report.length === 0 && (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-zinc-100 animate-pulse" />)}</div>
          )}
          {!loading && report.length === 0 && (
            <p className="text-sm text-zinc-500 py-10 text-center">Aucune donnée pour ces sections et ces filtres. Cochez d&apos;autres sections ou élargissez la période.</p>
          )}

          <AnimatePresence mode="popLayout">
            {report.map((s, i) => <SectionView key={s.id} s={s} index={i} />)}
          </AnimatePresence>

          <AnimatePresence>
            {(ai.data || ai.isError) && (
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 break-inside-avoid">
                <h2 className="text-sm font-bold text-zinc-900 border-b-2 border-amber-400 pb-1 flex items-center gap-1.5">
                  <Bot className="size-4 text-amber-500" /> Commentaire rédigé par l&apos;IA (DeerFlow)
                </h2>
                {ai.isError ? (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1.5 print:hidden"><TriangleAlert className="size-3.5" /> L&apos;agent IA est indisponible pour le moment. Le rapport chiffré reste complet.</p>
                ) : (
                  <>
                    <div className="text-[11px] leading-relaxed text-zinc-700 whitespace-pre-line">{ai.data}</div>
                    <p className="text-[9px] text-zinc-400">Texte généré automatiquement à partir des seuls chiffres de ce rapport ; à relire avant diffusion.</p>
                  </>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {report.length > 0 && (
            <footer className="pt-4 border-t border-zinc-200 flex items-center justify-between text-[9px] text-zinc-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="size-3 text-emerald-600" /> Chiffres issus des ventes enregistrées dans le réseau E-Maquis, sans données nominatives.</span>
              <span>{generatedAt}</span>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
