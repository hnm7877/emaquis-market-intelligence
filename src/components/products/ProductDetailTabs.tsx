'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, Bar } from 'recharts';
import { AlertTriangle, Calculator, Copy, History, MapPin, TrendingDown, TrendingUp, Truck, Waves } from 'lucide-react';
import { useProductDetailQuery } from '@/hooks/market/useMarketQueries';
import type { ProductDetail } from '@/lib/validations/market.schemas';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('fr-FR'));
const F = (n: number | null | undefined) => (n == null ? '—' : `${int(n)} F`);
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, (mo || 1) - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

type Tab = 'communes' | 'delivery' | 'history' | 'simulator' | 'elasticity';
const TABS: { id: Tab; label: string; icon: typeof MapPin }[] = [
  { id: 'communes', label: 'Prix par commune', icon: MapPin },
  { id: 'delivery', label: 'À livrer', icon: Truck },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'simulator', label: 'Simulateur', icon: Calculator },
  { id: 'elasticity', label: 'Sensibilité', icon: Waves },
];

/** Onglets de la fiche produit : chargés à l'ouverture (WebSocket), mis à jour en direct */
export function ProductDetailTabs({ productId, productName }: { productId: string; productName: string }) {
  const { data, isLoading } = useProductDetailQuery(productId);
  const d = data as ProductDetail | undefined;
  const [tab, setTab] = useState<Tab>('communes');

  return (
    <section className="rounded-xl border border-border">
      {/* Alerte d'évolution du prix d'achat */}
      {d?.purchaseChanges?.filter((c) => Math.abs(c.changePercent) >= 3).map((c) => (
        <div key={c.type} className={`flex items-start gap-2 border-b border-border px-3 py-2 text-[12px] ${c.changePercent > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
          {c.changePercent > 0 ? <TrendingUp className="mt-0.5 size-3.5 text-rose-400" /> : <TrendingDown className="mt-0.5 size-3.5 text-emerald-400" />}
          <span>
            Prix d&apos;achat du {c.type} {c.changePercent > 0 ? 'en hausse' : 'en baisse'} de <b>{Math.abs(c.changePercent)} %</b> sur 30 jours : {F(c.previousAvg)} → {F(c.recentAvg)} ({c.recentLots} livraisons récentes).
          </span>
        </div>
      ))}

      <div className="flex gap-1 overflow-x-auto border-b border-border p-1.5 no-scrollbar" role="tablist">
        {TABS.map((t) => {
          const on = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] transition-colors ${on ? 'font-semibold text-slate-950' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {on && <motion.span layoutId="detail-tab" className="absolute inset-0 rounded-md bg-amber-500" transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }} />}
              <Icon className="relative size-3" />
              <span className="relative">{t.label}</span>
              {t.id === 'delivery' && d?.delivery?.length ? <span className="relative rounded bg-rose-500 px-1 text-[9px] text-white">{d.delivery.length}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="p-3">
        {isLoading && !d ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : !d ? (
          <p className="text-xs text-muted-foreground">Détail indisponible.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE }}>
              {tab === 'communes' && <Communes d={d} />}
              {tab === 'delivery' && <Delivery d={d} productName={productName} />}
              {tab === 'history' && <HistoryChart d={d} />}
              {tab === 'simulator' && <Simulator d={d} />}
              {tab === 'elasticity' && <Elasticity d={d} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function Communes({ d }: { d: ProductDetail }) {
  if (!d.communes.length) return <p className="text-xs text-muted-foreground">Aucune vente localisée sur la période.</p>;
  return (
    <div>
      <p className="mb-2 text-[11px] text-muted-foreground">Prix conseillé = prix médian affiché par les établissements de la commune (à défaut, prix moyen encaissé).</p>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="py-1 text-left font-medium">Commune</th>
              <th className="py-1 text-right font-medium">Étab.</th>
              <th className="py-1 text-right font-medium">Fourchette</th>
              <th className="py-1 text-right font-medium">Prix moyen</th>
              <th className="py-1 text-right font-medium text-amber-500">Conseillé</th>
            </tr>
          </thead>
          <tbody>
            {d.communes.map((c) => (
              <tr key={`${c.commune}-${c.city}`} className="border-t border-border/60">
                <td className="py-1.5">
                  <div className="font-medium">{c.commune}</div>
                  <div className="text-[10px] text-muted-foreground">{c.city}</div>
                </td>
                <td className="py-1.5 text-right">{c.establishments}</td>
                <td className="py-1.5 text-right font-mono text-[11px] text-muted-foreground">{c.shelfMin != null ? `${int(c.shelfMin)} – ${int(c.shelfMax)}` : '—'}</td>
                <td className="py-1.5 text-right font-mono">{F(c.avgSalePrice)}</td>
                <td className="py-1.5 text-right font-mono font-semibold text-amber-500">{F(c.advisedPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Delivery({ d, productName }: { d: ProductDetail; productName: string }) {
  const [copied, setCopied] = useState(false);
  const byCommune = useMemo(() => {
    const m = new Map<string, ProductDetail['delivery']>();
    d.delivery.forEach((x) => m.set(`${x.commune} (${x.city})`, [...(m.get(`${x.commune} (${x.city})`) || []), x]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [d.delivery]);
  if (!d.delivery.length) return <p className="text-xs text-muted-foreground">Aucun établissement en rupture ou à moins de 3 jours de stock (parmi ceux dont le stock est synchronisé).</p>;
  const total = d.delivery.reduce((s, x) => s + x.suggested, 0);
  const copy = () => {
    const lines = [
      `Livraisons ${productName}`,
      ...byCommune.map(([c, list]) => `${c} : ${list.length} point(s), ${int(list.reduce((s, x) => s + x.suggested, 0))} bouteilles`),
      `Total conseillé : ${int(total)} bouteilles (7 jours de vente)`,
    ];
    navigator.clipboard?.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">
          {d.delivery.length} point(s) de vente · {int(total)} bouteilles pour tenir 7 jours
        </span>
        <button onClick={copy} className="flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 font-semibold text-slate-950">
          <Copy className="size-3" /> {copied ? 'Copié' : 'Copier (WhatsApp)'}
        </button>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {byCommune.map(([commune, list]) => (
          <div key={commune} className="rounded-lg border border-border/70">
            <div className="flex justify-between bg-muted/40 px-2.5 py-1 text-[11px] font-semibold">
              <span>{commune}</span>
              <span className="font-mono">{int(list.reduce((s, x) => s + x.suggested, 0))} bt.</span>
            </div>
            {list.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-2 border-t border-border/50 px-2.5 py-1 text-[11px]">
                <span className="text-muted-foreground">Point de vente {x.id.slice(-6)}</span>
                <span className={`font-mono ${x.quantity != null && x.quantity <= 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {x.quantity != null && x.quantity <= 0 ? 'rupture' : `${int(x.quantity)} en stock · ${x.daysCover ?? '—'} j`}
                </span>
                <span className="font-mono">+{int(x.suggested)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">Établissements anonymisés. Quantité conseillée = ventes de 7 jours moins le stock restant.</p>
    </div>
  );
}

function HistoryChart({ d }: { d: ProductDetail }) {
  if (!d.history.length) return <p className="text-xs text-muted-foreground">Pas encore d&apos;historique sur 12 mois.</p>;
  const data = d.history.map((h) => ({ ...h, label: monthLabel(h.month) }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ left: -8, right: 4, top: 6 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis yAxisId="p" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={42} />
          <YAxis yAxisId="v" orientation="right" hide />
          <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} formatter={(v, n) => [n === 'Volume' ? int(Number(v)) : F(Number(v)), n]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="v" dataKey="volume" name="Volume" fill="#334155" radius={[3, 3, 0, 0]} />
          <Line yAxisId="p" dataKey="avgSalePrice" name="Prix moyen encaissé" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
          <Line yAxisId="p" dataKey="unitCost" name="Coût d'achat bouteille" stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      {data.some((h) => h.lockerPrice || h.cartonPrice) && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          {data
            .filter((h) => h.lockerPrice || h.cartonPrice)
            .slice(-6)
            .map((h) => (
              <span key={h.month} className="rounded border border-border px-1.5 py-0.5 text-muted-foreground">
                {h.label} : {h.lockerPrice ? `casier ${int(h.lockerPrice)}` : ''}
                {h.lockerPrice && h.cartonPrice ? ' · ' : ''}
                {h.cartonPrice ? `carton ${int(h.cartonPrice)}` : ''}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Simulateur distributeur : effet d'un changement du prix du contenant sur la marge des
 * établissements (prix de revente inchangé, ou marge conservée) et, si la sensibilité au
 * prix est mesurée, sur les volumes.
 */
function Simulator({ d }: { d: ProductDetail }) {
  const sim = d.simulator;
  const container = sim?.containers?.[0];
  const [delta, setDelta] = useState(0);
  if (!sim || sim.unitCost == null || sim.avgSalePrice == null || !container) {
    return <p className="text-xs text-muted-foreground">Il faut au moins un achat casier / carton avec prix et des ventes pour simuler.</p>;
  }
  const per = container.bottlesPerContainer;
  const newContainer = container.avgPrice + delta;
  const newCost = newContainer / per;
  const marginNow = sim.avgSalePrice - sim.unitCost;
  const marginKeepPrice = sim.avgSalePrice - newCost;
  // Si les établissements répercutent la variation sur leur prix de vente
  const newShelf = sim.avgSalePrice + (newCost - sim.unitCost);
  const e = d.elasticity && d.elasticity.reading !== 'non significative' ? d.elasticity.coefficient : null;
  const volFactor = e != null && sim.avgSalePrice ? Math.pow(newShelf / sim.avgSalePrice, e) : null;
  const weeklyContainersNow = sim.weeklyVolume / per;
  const weeklyContainersAfter = volFactor != null ? weeklyContainersNow * volFactor : null;
  const step = Math.max(50, Math.round(container.avgPrice / 100 / 50) * 50);

  return (
    <div className="space-y-3 text-xs">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Prix du {container.type} ({per} bt.) : <b className="text-foreground">{F(container.avgPrice)}</b> →{' '}
            <b className={delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-rose-400' : 'text-foreground'}>{F(newContainer)}</b>
          </span>
          {delta !== 0 && (
            <button onClick={() => setDelta(0)} className="text-[10px] text-muted-foreground hover:text-foreground">
              Réinitialiser
            </button>
          )}
        </div>
        <input
          type="range"
          min={-Math.round(container.avgPrice * 0.2)}
          max={Math.round(container.avgPrice * 0.2)}
          step={step}
          value={delta}
          onChange={(ev) => setDelta(Number(ev.target.value))}
          className="mt-1 w-full accent-amber-500"
          aria-label="Variation du prix du contenant"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>−20 %</span>
          <span>{delta >= 0 ? '+' : ''}{int(delta)} F</span>
          <span>+20 %</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Box label="Coût bouteille" now={F(sim.unitCost)} after={F(newCost)} />
        <Box label="Marge établissement (prix inchangé)" now={F(marginNow)} after={F(marginKeepPrice)} tone={marginKeepPrice >= marginNow ? 'up' : 'down'} />
        <Box label="Prix de revente si répercuté" now={F(sim.avgSalePrice)} after={F(newShelf)} />
        <Box
          label="Casiers / cartons vendus par semaine"
          now={int(weeklyContainersNow)}
          after={weeklyContainersAfter == null ? 'sensibilité inconnue' : int(weeklyContainersAfter)}
          tone={weeklyContainersAfter == null ? undefined : weeklyContainersAfter >= weeklyContainersNow ? 'up' : 'down'}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Calcul sur le prix moyen réel du contenant ({container.lots} achats, {container.establishments} établissements) et les ventes de la période.
        {e != null ? ` Effet volume estimé avec la sensibilité observée (${e}).` : ' Effet sur les volumes non estimé : sensibilité au prix pas encore mesurable.'}
      </p>
    </div>
  );
}

function Box({ label, now, after, tone }: { label: string; now: string; after: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-[11px] text-muted-foreground line-through decoration-muted-foreground/40">{now}</div>
      <div className={`font-mono text-sm font-semibold ${tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : ''}`}>{after}</div>
    </div>
  );
}

function Elasticity({ d }: { d: ProductDetail }) {
  const e = d.elasticity;
  return (
    <div className="space-y-2 text-xs">
      {e ? (
        <div className={`flex items-start gap-2 rounded-lg px-2.5 py-2 ${e.reading === 'non significative' ? 'bg-muted/40' : 'bg-amber-500/10'}`}>
          <AlertTriangle className="mt-0.5 size-3.5 text-amber-500" />
          <span>
            {e.reading === 'non significative'
              ? `Pas de lien net entre le prix et les ventes (${e.points} établissements comparés).`
              : `Sensibilité ${e.reading} : +10 % de prix ≈ ${e.coefficient * 10 >= 0 ? '+' : ''}${(e.coefficient * 10).toFixed(1)} % de ventes par établissement (${e.points} établissements, fiabilité ${Math.round(e.r2 * 100)} %).`}
          </span>
        </div>
      ) : (
        <p className="text-muted-foreground">Pas encore mesurable : il faut au moins 8 établissements vendeurs avec des prix différents.</p>
      )}
      {d.scatter.length > 2 && (
        <ResponsiveContainer width="100%" height={210}>
          <ScatterChart margin={{ left: -8, right: 8, top: 6 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="price" name="Prix affiché" unit=" F" stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
            <YAxis type="number" dataKey="weeklyVolume" name="Ventes / semaine" stroke="#64748b" fontSize={10} tickLine={false} width={40} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
              formatter={(v, n) => [n === 'Prix affiché' ? F(Number(v)) : int(Number(v)), n]}
            />
            <Scatter data={d.scatter} fill="#f59e0b" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      )}
      <p className="text-[10px] text-muted-foreground">Chaque point est un établissement (anonymisé) : prix affiché et ventes par semaine. C&apos;est une comparaison entre établissements, pas une expérience : d&apos;autres facteurs (quartier, clientèle) jouent aussi.</p>
    </div>
  );
}
