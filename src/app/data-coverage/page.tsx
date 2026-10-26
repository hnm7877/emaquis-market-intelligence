'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Boxes, Calendar, CheckCircle2, Database, Layers, MapPin, Navigation, Receipt, ShieldCheck, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { InfoTip } from '@/components/ui/InfoTip';
import { useDataCoverageQuery } from '@/hooks/market/useMarketQueries';

const EASE = [0.23, 1, 0.32, 1] as const;
const int = (n: number) => Math.round(n).toLocaleString('fr-FR');
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1] ?? ''} ${m.slice(2, 4)}`;
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = 'text-orange-500', delay = 0, help }: { icon: React.ElementType; label: string; value: number | null | undefined; sub?: string; tone?: string; delay?: number; help?: string }) {
  return (
    <Reveal delay={delay} className="h-full">
      <Card className="h-full p-4 border border-border/80 bg-card/70">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Icon className={`size-3.5 ${tone}`} /> {label} {help && <InfoTip text={help} title={label} />}
        </div>
        <div className="mt-1.5 text-2xl font-extrabold tabular-nums">{value == null ? '—' : <AnimatedNumber value={value} format={int} fromZero />}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </Card>
    </Reveal>
  );
}

/** Jauge de qualité animée (vert ≥ 80 %, ambre ≥ 50 %, rouge sinon) */
function Gauge({ label, value, hint }: { label: string; value: number; hint: string }) {
  const reduce = useReducedMotion();
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <strong className="tabular-nums">{value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</strong>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE }} />
      </div>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function DataCoveragePage() {
  const { data, isLoading, isError } = useDataCoverageQuery();
  const o = data?.networkOverview;
  const h = data?.networkHealth;
  const maxCity = Math.max(...(h?.cities ?? []).map((c) => c.salesShare), 1);
  const last = h?.monthly.at(-1);
  const prev = h?.monthly.at(-2);
  const estGrowth = last && prev && prev.establishments > 0 ? Math.round(((last.establishments - prev.establishments) / prev.establishments) * 1000) / 10 : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Database className="size-5 text-orange-500" /> Couverture du réseau
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading ? 'Comptage…' : isError ? 'API indisponible' : 'Comptages réels, en direct'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            D&apos;où viennent les chiffres : taille, fraîcheur et qualité de l&apos;échantillon E-Maquis sur lequel reposent tous les indicateurs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Store} label="Établissements actifs" value={o?.activeEstablishments ?? null} sub={o ? `${int(o.registeredEstablishments)} comptes inscrits` : undefined} help="Établissements ayant enregistré au moins une vente." />
        <Stat icon={Receipt} tone="text-emerald-400" label="Ventes analysées" value={o?.totalAnalyzedTransactions ?? null} sub={o ? `depuis le ${fmtDate(o.firstSaleDate)}` : undefined} delay={0.04} />
        <Stat icon={MapPin} tone="text-sky-400" label="Communes couvertes" value={o?.communesCovered ?? null} sub={o ? `${int(o.citiesCovered)} villes` : undefined} delay={0.08} />
        <Stat icon={Layers} tone="text-amber-400" label="Références catalogue" value={o?.catalogProductsCount ?? null} sub={o ? `${int(o.catalogCategoriesCount)} catégories` : undefined} delay={0.12} />
      </div>

      {h && (
        <>
          <Reveal delay={0.1}>
            <Card className="p-4 border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Activity className="size-4 text-emerald-400" /> Fraîcheur des données
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  ['Ventes des dernières 24 h', h.freshness.sales24h],
                  ['Ventes des 7 derniers jours', h.freshness.sales7d],
                  ['Établissements actifs cette semaine', h.freshness.activeEstablishments7d],
                ].map(([label, v]) => (
                  <div key={label as string} className="rounded-lg bg-background/50 border border-border/60 p-3">
                    <span className="text-muted-foreground block">{label}</span>
                    <span className="text-xl font-bold tabular-nums"><AnimatedNumber value={v as number} format={int} fromZero /></span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Dernière vente reçue : {o?.lastSaleDate ? new Date(o.lastSaleDate).toLocaleString('fr-FR') : '—'}. Les ventes arrivent en direct depuis les caisses.</p>
            </Card>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Reveal delay={0.12}>
              <Card className="p-4 border border-border/80 bg-card/70 h-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Calendar className="size-4 text-orange-400" /> Croissance du réseau (12 mois)</span>
                  {estGrowth != null && <span className={`text-xs font-mono ${estGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{estGrowth > 0 ? '+' : ''}{estGrowth} % d&apos;établissements ce mois</span>}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={h.monthly} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gEst" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.45} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} vertical={false} />
                      <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="e" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis yAxisId="s" orientation="right" tick={{ fontSize: 10 }} hide />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelFormatter={(m) => monthLabel(String(m))}
                        formatter={(v, n) => [int(Number(v)), n === 'establishments' ? 'Établissements actifs' : 'Ventes']} />
                      <Area yAxisId="s" type="monotone" dataKey="sales" stroke="#38bdf8" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" />
                      <Area yAxisId="e" type="monotone" dataKey="establishments" stroke="#f97316" fill="url(#gEst)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground">Orange : établissements ayant vendu dans le mois. Pointillés bleus : ventes.</p>
              </Card>
            </Reveal>

            <Reveal delay={0.16}>
              <Card className="p-4 border border-border/80 bg-card/70 h-full space-y-3">
                <span className="flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-sky-400" /> Répartition par ville</span>
                <div className="space-y-2.5">
                  {h.cities.map((c, i) => (
                    <div key={c.city} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{c.city}</span>
                        <span className="tabular-nums text-muted-foreground">
                          <strong className="text-foreground">{c.salesShare} %</strong> des ventes · {int(c.establishments)} établ. · {c.communes} communes
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <motion.div className="h-full rounded-full bg-sky-500" initial={{ width: 0 }} animate={{ width: `${(c.salesShare / maxCity) * 100}%` }} transition={{ duration: 0.8, ease: EASE, delay: i * 0.04 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <Card className="p-4 border border-border/80 bg-card/70 space-y-4">
              <span className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-emerald-400" /> Qualité des données</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <Gauge label="Établissements localisés" value={h.location.localizedShare} hint={`${int(h.location.exactPosition)} à la position exacte (épingle ou barman sur place), ${int(h.location.declaredAddress)} par adresse déclarée, ${int(h.location.unlocalized)} sans adresse.`} />
                <Gauge label="Position exacte" value={h.location.exactShare} hint="Part des établissements actifs placés au mètre près sur la carte." />
                <Gauge label="Stock synchronisé" value={h.stockSync.establishmentsShare} hint={`${int(h.stockSync.establishments)} établissements actifs partagent leur stock (${int(h.stockSync.positions)} produits suivis).`} />
                <Gauge label="Produits rattachés au catalogue" value={h.stockSync.catalogMappedShare} hint="Produits en stock reliés à une référence du catalogue global (marque, catégorie)." />
                <Gauge label="Prix d'achat renseignés" value={h.stockSync.purchasePriceShare} hint="Permet de calculer marges et valeur du stock." />
              </div>
            </Card>
          </Reveal>
        </>
      )}

      {(o?.establishmentTypes?.length ?? 0) > 0 && (
        <Reveal delay={0.22}>
          <Card className="p-4 border border-border/80 bg-card/70 space-y-2.5 text-xs">
            <span className="flex items-center gap-2 font-semibold text-sm"><Boxes className="size-4 text-orange-500" /> Types d&apos;établissement</span>
            <p className="text-muted-foreground">{int(o?.typedEstablishments ?? 0)} établissement(s) actif(s) sur {int(o?.activeEstablishments ?? 0)} ont renseigné leur type.</p>
            <div className="flex flex-wrap gap-2">
              {o?.establishmentTypes?.map((t) => (
                <span key={t.value} className="px-2 py-0.5 rounded-md border border-border/60 bg-background/60">{t.label} : <strong className="text-foreground">{t.count}</strong></span>
              ))}
            </div>
          </Card>
        </Reveal>
      )}

      <Card className="p-5 border border-border/80 bg-card/70 space-y-2 text-xs leading-relaxed">
        <span className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Méthode et confidentialité</span>
        <p className="text-muted-foreground">
          Les indicateurs représentent les <strong className="text-foreground">ventes observées dans le réseau E-Maquis</strong> ({o ? `${o.dateSpanMonths} mois d'historique` : '—'}). Ils ne doivent pas être extrapolés au marché ivoirien entier sans modèle statistique.
        </p>
        {o?.methodology && <p className="text-muted-foreground">{o.methodology}</p>}
        <p className="text-muted-foreground flex items-start gap-1.5">
          <Navigation className="size-3.5 mt-0.5 shrink-0" /> Aucune donnée de consommateur n&apos;est collectée. Les distributeurs voient des chiffres agrégés ; les montants par établissement sont donnés par tranche.
        </p>
      </Card>
    </div>
  );
}
