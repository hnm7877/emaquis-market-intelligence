'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, CandlestickChart, Crown, Flame, Globe2, Lock, Minus, Radar, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { usePublicBoard } from '@/hooks/usePublicBoard';
import { usePublicBoardStore } from '@/stores/usePublicBoardStore';
import type { PublicBoard, PublicBoardItem } from '@/lib/validations/public-board.schema';
import { Sparkline } from './Sparkline';
import { ProductAvatar } from './ProductAvatar';

const EASE = [0.23, 1, 0.32, 1] as const;
const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`);
const tone = (v: number | null) => (v == null || v === 0 ? 'text-muted-foreground' : v > 0 ? 'text-emerald-400' : 'text-red-400');

/** Heure courante, rafraîchie chaque seconde ; 0 au rendu serveur (évite tout écart d'hydratation) */
/** « il y a 3 min » à partir d'une date (vide tant que l'heure n'est pas connue côté navigateur) */
function agoLabel(iso: string | null | undefined, now: number) {
  if (!iso || !now) return '';
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d < 30 ? `il y a ${d} j` : '';
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, ms);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [ms]);
  return now;
}

function LivePill({ updatedAt, connected }: { updatedAt?: string; connected: boolean }) {
  const now = useNow();
  const s = updatedAt && now ? Math.max(0, Math.round((now - new Date(updatedAt).getTime()) / 1000)) : null;
  const ago = s == null ? '' : s < 60 ? `il y a ${s} s` : `il y a ${Math.floor(s / 60)} min`;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
      <span className="relative flex size-2">
        {connected && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />}
        <span className={`relative inline-flex size-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      </span>
      {connected ? 'En direct' : 'Reconnexion…'}
      {ago && <span className="text-amber-200/60">· mis à jour {ago}</span>}
    </span>
  );
}

function RankMove({ item }: { item: PublicBoardItem }) {
  if (item.previousRank == null) return <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Nouveau</span>;
  const d = item.previousRank - item.rank;
  if (d === 0) return <Minus className="size-3.5 text-muted-foreground" aria-label="Même place" />;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${d > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {d > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(d)}
      <span className="sr-only">{d > 0 ? 'places gagnées' : 'places perdues'}</span>
    </span>
  );
}

function Watchlist({ board, flashing, sold, now }: { board: PublicBoard | undefined; flashing: Set<string>; sold: Set<string>; now: number }) {
  const items = board?.items ?? [];
  return (
    <div role="table" aria-label="Classement des produits" className="text-sm">
      <div role="row" className="sticky top-0 z-10 grid grid-cols-[1.75rem_minmax(0,1fr)_2.75rem_4.75rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_4rem_5.5rem] items-center gap-2 border-b border-border/60 px-3 pb-2 text-[11px] text-muted-foreground">
        <span role="columnheader">#</span>
        <span role="columnheader">Produits ({items.length})</span>
        <span role="columnheader" className="hidden text-center sm:block">Tendance 14 j</span>
        <span role="columnheader" className="text-right">Places</span>
        <span role="columnheader" className="text-right">Var.</span>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-12 text-center text-xs text-muted-foreground">Pas encore assez de ventes sur ce périmètre pour publier un classement.</p>
      ) : (
        <div className="relative">
        <motion.ol layout className="scroll-thin relative max-h-[520px] overflow-y-auto overscroll-contain pr-1 pb-6">
          {items.map((it) => {
            const flash = flashing.has(it.name);
            const justSold = sold.has(it.name);
            const ago = agoLabel(it.lastSoldAt, now);
            const fresh = !!it.lastSoldAt && now > 0 && now - new Date(it.lastSoldAt).getTime() < 15 * 60_000;
            return (
              <motion.li
                key={it.name}
                role="row"
                layout="position"
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className={`grid grid-cols-[1.75rem_minmax(0,1fr)_2.75rem_4.75rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_4rem_5.5rem] items-center gap-2 relative rounded-lg px-3 py-2 transition-colors duration-700 ${flash ? 'bg-emerald-500/15 ring-1 ring-emerald-400/40' : justSold ? 'bg-amber-500/10 ring-1 ring-amber-400/40' : 'hover:bg-white/[0.03]'}`}
              >
                <span role="cell" className={`text-xs font-bold tabular-nums ${it.rank <= 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {it.rank === 1 ? <Crown className="size-4 text-amber-400" aria-label="Premier" /> : it.rank}
                </span>
                <span role="cell" className="flex min-w-0 items-center gap-2.5">
                  <span className="relative shrink-0">
                    <ProductAvatar name={it.name} brand={it.brand} />
                    {fresh && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70 motion-reduce:animate-none" />
                        <span className="relative inline-flex size-2.5 rounded-full border border-background bg-emerald-400" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-foreground">{it.name}</span>
                      <AnimatePresence>
                        {justSold && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                            className="shrink-0 rounded-full bg-amber-500 px-1.5 py-px text-[9px] font-bold uppercase text-black"
                          >
                            Vente
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {[it.brand, it.category].filter(Boolean).join(' · ') || '—'}
                      {ago && <span className={fresh ? 'text-emerald-400' : ''}> · vendu {ago}</span>}
                    </span>
                  </span>
                </span>
                <span role="cell" className="hidden justify-center sm:flex">
                  <Sparkline values={it.spark} up={it.changePercent == null ? null : it.changePercent >= 0} />
                </span>
                <span role="cell" className="flex justify-end">
                  <RankMove item={it} />
                </span>
                <span role="cell" className={`flex items-center justify-end gap-0.5 text-xs font-semibold tabular-nums ${tone(it.changePercent)}`}>
                  {it.changePercent != null && it.changePercent !== 0 && (it.changePercent > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />)}
                  {pct(it.changePercent)}
                </span>
              </motion.li>
            );
          })}
        </motion.ol>
          {/* Fondu en bas : la liste continue */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-xl bg-gradient-to-t from-card to-transparent" />
        </div>
      )}
    </div>
  );
}

function Highlight({ icon: Icon, label, item, value, accent }: { icon: React.ElementType; label: string; item?: PublicBoardItem; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-3">
      <Icon className={`size-4 shrink-0 ${accent}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{item?.name ?? '—'}</p>
      </div>
      <span className={`text-sm font-bold tabular-nums ${accent}`}>{item ? value : ''}</span>
    </div>
  );
}

const FEATURES = [
  { icon: CandlestickChart, title: 'Bourse des produits', text: 'Prix de vente réels en chandeliers (5 min à 1 jour), écart vente / achat, alertes de prix.' },
  { icon: Radar, title: 'Score produit', text: 'Rentabilité, croissance, dynamique et présence : le profil de chaque produit en un coup d’œil.' },
  { icon: BarChart3, title: 'Carte du marché', text: 'Catégories et marques en carte de chaleur, parts de marché et duels par commune.' },
  { icon: Zap, title: 'Alertes en direct', text: 'Ruptures, dépassements de leadership et pics de consommation dès qu’ils arrivent.' },
];

/**
 * Accueil public : classement des produits en direct (rangs et variations uniquement,
 * aucun volume ni établissement), pour donner envie d'accéder à la plateforme.
 */
export function PublicLanding({ initial }: { initial: PublicBoard | null }) {
  const { scope, setScope, connected, overtakes, sales } = usePublicBoardStore();
  const { data: board, isError } = usePublicBoard(initial);
  const countries = board?.countries ?? initial?.countries ?? [];
  const now = useNow(1000);

  const flashing = useMemo(() => new Set(overtakes.filter((o) => now - o.at < 4000).map((o) => o.winner)), [overtakes, now]);
  const latest = overtakes[0] && now - overtakes[0].at < 6000 ? overtakes[0] : null;
  const sold = useMemo(() => new Set(sales.filter((x) => now - x.at < 5000).map((x) => x.name)), [sales, now]);
  // Fil d'activité : ventes et dépassements, du plus récent au plus ancien
  const activity = useMemo(
    () =>
      [
        ...overtakes.map((o) => ({ id: o.id, at: o.at, when: new Date(o.at).toISOString(), kind: 'overtake' as const, text: `${o.winner} passe devant ${o.loser}`, rank: o.rank })),
        // Heure affichée = heure réelle de la vente (collection des ventes), pas l'heure de réception
        ...sales.map((x) => ({ id: x.id, at: x.at, when: x.soldAt, kind: 'sale' as const, text: `${x.name} vendu`, rank: x.rank })),
      ]
        .sort((a, b) => b.at - a.at)
        .slice(0, 15),
    [overtakes, sales],
  );

  const highlights = useMemo(() => {
    const items = board?.items ?? [];
    const withChange = items.filter((i) => i.changePercent != null);
    const best = [...withChange].sort((a, b) => b.changePercent! - a.changePercent!)[0];
    const worst = [...withChange].sort((a, b) => a.changePercent! - b.changePercent!)[0];
    const climber = [...items].filter((i) => i.previousRank != null && i.previousRank > i.rank).sort((a, b) => b.previousRank! - b.rank - (a.previousRank! - a.rank))[0];
    return { best, worst: worst && worst.changePercent! < 0 ? worst : undefined, climber };
  }, [board?.items]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-background">
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.18),transparent_60%)]" />

        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-sm font-black text-white">EM</span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-foreground">E-MAQUIS</span>
              <span className="block text-[11px] text-muted-foreground">Market Intelligence</span>
            </span>
          </span>
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            Se connecter <ArrowRight className="size-4" />
          </Link>
        </header>

        <main className="relative mx-auto max-w-7xl space-y-10 px-4 pb-16 sm:px-6">
          <section className="space-y-4 pt-6 text-center sm:pt-10">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
              <LivePill updatedAt={board?.updatedAt} connected={connected} />
            </motion.div>
            <h1
              className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-foreground sm:text-5xl"
            >
              La bourse des boissons, <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">en temps réel</span>
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
              Chaque vente enregistrée dans les maquis, bars et restaurants du réseau E-Maquis fait bouger ce classement. Regardez les produits se dépasser, en direct.
            </p>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-3 backdrop-blur-md sm:p-4 lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <span className="size-2.5 rounded-sm bg-amber-500" /> Classement des produits
                </h2>
                <span className="text-[11px] text-muted-foreground">Toutes les ventes du réseau · variation sur 7 jours</span>
              </div>

              {countries.length > 0 && (
                <div className="mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 text-xs" role="group" aria-label="Pays">
                  {[{ code: 'all', name: 'Tous les pays', flag: '', iso: '' }, ...countries].map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      aria-pressed={scope === c.code}
                      onClick={() => setScope(c.code)}
                      className={`shrink-0 rounded-full border px-3 py-1 transition-colors ${scope === c.code ? 'border-amber-500/60 bg-amber-500/15 text-amber-200' : 'border-border/60 text-muted-foreground hover:text-foreground'}`}
                    >
                      {c.code === 'all' ? (
                        <Globe2 className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
                      ) : (
                        c.iso && <span aria-hidden="true" className="mr-1 rounded bg-white/10 px-1 py-px text-[9px] font-bold tracking-wide">{c.iso}</span>
                      )}
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              <div aria-live="polite" className="min-h-0">
                <AnimatePresence>
                  {latest && (
                    <motion.p
                      key={latest.id}
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="mb-2 flex items-center gap-2 overflow-hidden rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
                    >
                      <Flame className="size-3.5 shrink-0" />
                      <span>
                        <strong>{latest.winner}</strong> passe devant <strong>{latest.loser}</strong> et prend la {latest.rank === 1 ? '1re' : `${latest.rank}e`} place
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {isError && !board ? (
                <p className="px-3 py-12 text-center text-xs text-muted-foreground">Classement momentanément indisponible.</p>
              ) : (
                <Watchlist board={board} flashing={flashing} sold={sold} now={now} />
              )}
            </div>

            <aside className="space-y-4">
              <div className="space-y-2">
                <Highlight icon={TrendingUp} label="Plus forte hausse" item={highlights.best} value={pct(highlights.best?.changePercent ?? null)} accent="text-emerald-400" />
                <Highlight icon={ArrowUp} label="Plus belle remontée" item={highlights.climber} value={highlights.climber ? `+${highlights.climber.previousRank! - highlights.climber.rank} pl.` : ''} accent="text-amber-400" />
                <Highlight icon={TrendingDown} label="Plus forte baisse" item={highlights.worst} value={pct(highlights.worst?.changePercent ?? null)} accent="text-red-400" />
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/70 p-4 backdrop-blur-md">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="size-4 text-amber-400" /> Activité en direct
                </h2>
                {activity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Les ventes et les dépassements s’afficheront ici dès qu’ils arrivent, sans recharger la page.</p>
                ) : (
                  <ul className="scroll-thin max-h-64 space-y-2 overflow-y-auto pr-1" aria-live="polite">
                    <AnimatePresence initial={false}>
                      {activity.map((e) => (
                        <motion.li
                          key={e.id}
                          layout
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="flex items-start gap-2 text-xs"
                        >
                          {e.kind === 'overtake' ? <ArrowUp className="mt-0.5 size-3 shrink-0 text-emerald-400" /> : <Zap className="mt-0.5 size-3 shrink-0 text-amber-400" />}
                          <span className="min-w-0 flex-1 text-muted-foreground">
                            <span className={e.kind === 'overtake' ? 'text-foreground' : ''}>{e.text}</span> · n°{e.rank}
                          </span>
                          <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground/70">{agoLabel(e.when, now)}</span>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-transparent p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Lock className="size-4 text-amber-400" /> Voir les chiffres derrière le classement
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Volumes, prix, marges, communes et concurrents : réservé aux partenaires connectés.</p>
                <Link href="/login" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200">
                  Accéder à la plateforme <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </aside>
          </section>

          <section aria-labelledby="features" className="space-y-4">
            <h2 id="features" className="text-center text-lg font-bold text-foreground">Après connexion</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: i * 0.06 }}
                  className="rounded-xl border border-border/70 bg-card/60 p-4"
                >
                  <f.icon className="size-5 text-amber-400" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <footer className="flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-400" /> Classement calculé sur toutes les unités réellement vendues. Seuls des rangs et des variations sont publiés.
            </span>
            <span className="flex items-center gap-1.5">
              <Globe2 className="size-3.5" /> Toutes les ventes enregistrées, regroupées par pays ; heure = dernière vente enregistrée ; variation = 7 derniers jours contre les 7 précédents ; courbe = indice base 100 sur 14 jours.
            </span>
          </footer>
        </main>
      </div>
    </MotionConfig>
  );
}
