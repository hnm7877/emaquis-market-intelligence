'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Flame,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  Play,
  Pause,
  Shuffle,
  BarChart2,
  Package,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Activity,
  Info,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBrandLogo } from '@/utils/brandLogos';
import { formatProductTicker } from '@/utils/productImages';
import { DisplayVolumeUnit, formatProductVolume, extractBottleSizeCl } from '@/utils/productVolumeConverter';
import { getMarketSocket } from '@/api/socket';

export interface LadderProduct {
  id: string;
  symbol: string;
  name: string;
  brand: string;
  category: string;
  format?: string;
  /** Prix de vente moyen réellement payé (null : inconnu) */
  price: number | null;
  volume: number; // Volume réel de la BD (cols/bouteilles vendues)
  previousVolume: number;
  rank: number;
  previousRank: number;
  velocity: number; // Cols / heure : volume de la période / heures de la période
  /** Variation réelle vs période précédente (null : pas d'historique) */
  growth: number | null;
  color: string;
  image: string | null;
  brandLogo: string | null;
  recentSaleDelta?: number;
}

interface LiveTradingLadderProps {
  apiProducts?: any[];
  unit?: DisplayVolumeUnit;
  onOpenGlossary?: () => void;
  onOvertakeAlert?: (overtaker: string, overtaken: string) => void;
  /** Durée réelle de la période analysée, en jours (pour la vitesse horaire) */
  spanDays?: number;
}

export type ProductViewMode = 'ladder' | 'showcase' | 'velocity';

export const LiveTradingLadder: React.FC<LiveTradingLadderProps> = ({
  apiProducts,
  unit = 'cols',
  onOpenGlossary,
  onOvertakeAlert,
  spanDays,
}) => {
  const [products, setProducts] = useState<LadderProduct[]>([]);
  const prevRanks = useRef<Map<string, number>>(new Map());
  const [viewMode, setViewMode] = useState<ProductViewMode>('ladder');
  const [isAutoSwipeEnabled, setIsAutoSwipeEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [lastOvertake, setLastOvertake] = useState<{ winner: string; loser: string; time: string } | null>(null);

  // Synchronisation stricte avec les VRAIS volumes de la base de données (zéro valeur inventée)
  useEffect(() => {
    if (!apiProducts || apiProducts.length === 0) return;

    // Récupération des vrais produits de la BD, triés par volume réel
    const validProds = apiProducts
      .filter((p: any) => p && p.name && (p.volume ?? 0) >= 0)
      .slice(0, 12);

    if (validProds.length >= 2) {
      const hours = Math.max(1, (spanDays && spanDays > 0 ? spanDays : 1) * 24);
      const mapped: LadderProduct[] = validProds.map((p: any, idx: number) => {
        const realName = (p.name || '').trim();
        const realBrand = (p.brand || 'Non spécifié').trim();
        // Image du catalogue uniquement (aucune photo d'illustration)
        const realImage = typeof p.image === 'string' && /^(https?:)?\/\//.test(p.image) ? p.image : null;
        const brandLogo = getBrandLogo(realBrand);
        const symbol = formatProductTicker(realName);
        // Volume exact de la base de données
        const realVolume = Number(p.volume) || 0;
        const avg = Number(p.pricing?.avgSalePrice) || (p.revenue && realVolume > 0 ? Math.round(p.revenue / realVolume) : 0);
        return {
          id: p.id || `p_${idx}`,
          symbol,
          name: realName,
          brand: realBrand,
          category: p.category || 'Boissons',
          format: p.format || p.size || '',
          price: avg > 0 ? avg : null,
          volume: realVolume,
          previousVolume: realVolume,
          rank: idx + 1,
          previousRank: idx + 1,
          velocity: Math.round((realVolume / hours) * 10) / 10,
          growth: typeof p.growth === 'number' ? p.growth : null,
          color: '',
          image: realImage,
          brandLogo,
        };
      });

      // Tri strict par volume réel décroissant ; rang précédent conservé pour détecter les dépassements
      mapped.sort((a, b) => b.volume - a.volume);
      const before = prevRanks.current;
      mapped.forEach((p, i) => {
        p.rank = i + 1;
        p.previousRank = before.get(p.id) ?? i + 1;
      });
      if (before.size) {
        for (const p of mapped) {
          if (p.rank >= p.previousRank) continue;
          const loser = mapped.find((o) => o.id !== p.id && o.previousRank === p.rank && o.rank > p.rank);
          if (loser) {
            setLastOvertake({ winner: p.name, loser: loser.name, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });
            onOvertakeAlert?.(p.name, loser.name);
            break;
          }
        }
      }
      prevRanks.current = new Map(mapped.map((p) => [p.id, p.rank]));

      setProducts(mapped);
    }
  }, [apiProducts, spanDays, onOvertakeAlert]);

  // Les volumes se mettent à jour par les données poussées en direct (mi:data) : plus d'écoute
  // d'un événement « market_sale_recorded » que le serveur n'émet pas.

  // Moteur d'Auto-Swipe automatique entre les différentes vues produits (toutes les 8 secondes)
  useEffect(() => {
    if (!isAutoSwipeEnabled || isHovered) return;

    const intervalTime = 8000;
    const tickStep = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += tickStep;
      setSwipeProgress(Math.min(100, (elapsed / intervalTime) * 100));

      if (elapsed >= intervalTime) {
        elapsed = 0;
        setSwipeProgress(0);
        setViewMode((current) => {
          if (current === 'ladder') return 'showcase';
          if (current === 'showcase') return 'velocity';
          return 'ladder';
        });
      }
    }, tickStep);

    return () => clearInterval(timer);
  }, [isAutoSwipeEnabled, isHovered]);

  const topVolume = products[0]?.volume || 1;

  // Navigation manuelle entre les vues
  const handleNextView = () => {
    setSwipeProgress(0);
    setViewMode((prev) => (prev === 'ladder' ? 'showcase' : prev === 'showcase' ? 'velocity' : 'ladder'));
  };

  const handlePrevView = () => {
    setSwipeProgress(0);
    setViewMode((prev) => (prev === 'ladder' ? 'velocity' : prev === 'velocity' ? 'showcase' : 'ladder'));
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl p-5 shadow-2xl space-y-4"
    >
      {/* Barre de contrôle et sélecteur de vues avec Auto-Swipe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="size-5 text-orange-400" />
              Bourse des Boissons • Vrais Produits &amp; Volumes de la Base
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30">
              {unit === 'litres' ? 'En Litres (L)' : unit === 'cl' ? 'En Centilitres (cL)' : unit === 'casiers' ? 'En Casiers' : 'En Bouteilles (Cols)'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Données authentiques de la base de données. Défilement automatique actif entre les vues.
          </p>
        </div>

        {/* Contrôles de vues et bouton Lexique explicatif */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenGlossary}
            className="h-8 text-xs font-mono text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 border border-cyan-500/30 gap-1.5"
            title="Ouvrir le lexique des termes"
          >
            <HelpCircle className="size-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Comprendre</span> Vélocité &amp; Termes
          </Button>

          {/* Vues Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => { setViewMode('ladder'); setSwipeProgress(0); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                viewMode === 'ladder'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ladder Bourse
            </button>
            <button
              onClick={() => { setViewMode('showcase'); setSwipeProgress(0); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                viewMode === 'showcase'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vitrine Photos
            </button>
            <button
              onClick={() => { setViewMode('velocity'); setSwipeProgress(0); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                viewMode === 'velocity'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Radar Vélocité
            </button>
          </div>

          {/* Auto-Swipe Pause & Navigation */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePrevView}
              className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-foreground"
              title="Vue précédente"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAutoSwipeEnabled((v) => !v)}
              className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-foreground"
              title={isAutoSwipeEnabled ? 'Pause auto-swipe' : 'Activer auto-swipe'}
            >
              {isAutoSwipeEnabled ? <Pause className="size-3.5 text-orange-400" /> : <Play className="size-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNextView}
              className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-foreground"
              title="Vue suivante"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Barre de progression subtile de l'Auto-Swipe */}
      {isAutoSwipeEnabled && !isHovered && (
        <div className="w-full bg-slate-900 h-0.5 rounded-full overflow-hidden">
          <div
            className="bg-orange-500 h-full transition-all duration-100 ease-linear"
            style={{ width: `${swipeProgress}%` }}
          />
        </div>
      )}

      {/* CONTENU PRINCIPAL MULTI-VUES */}
      <AnimatePresence mode="wait">
        {/* VUE 1 : TRADING LADDER (Course Boursière Authentique) */}
        {lastOvertake && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <Flame className="size-3.5 shrink-0" />
            <span>
              <strong>{lastOvertake.winner}</strong> passe devant <strong>{lastOvertake.loser}</strong> · {lastOvertake.time}
            </span>
          </div>
        )}

        {products.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">Chargement des produits du réseau… (aucune donnée affichée tant que les vraies ventes ne sont pas reçues)</p>
        )}

        {viewMode === 'ladder' && (
          <motion.div
            key="ladder-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            {/* Entête des colonnes avec infobulles */}
            <div className="grid grid-cols-12 text-[11px] font-mono font-semibold text-slate-400 px-3 py-1">
              <div className="col-span-1 text-center">RANG</div>
              <div className="col-span-6 sm:col-span-5">PRODUIT &amp; MARQUE RÉELS</div>
              <div className="col-span-2 sm:col-span-2 text-right flex items-center justify-end gap-1">
                <span>VOLUME ÉCOULÉ</span>
                <span
                  onClick={onOpenGlossary}
                  className="cursor-pointer text-cyan-400 hover:text-cyan-300"
                  title="Voir explication Volume Écoulé"
                >
                  ℹ️
                </span>
              </div>
              <div className="col-span-2 sm:col-span-2 text-right hidden sm:flex items-center justify-end gap-1">
                <span>VÉLOCITÉ</span>
                <span
                  onClick={onOpenGlossary}
                  className="cursor-pointer text-cyan-400 hover:text-cyan-300"
                  title="Voir explication Vélocité"
                >
                  ℹ️
                </span>
              </div>
              <div className="col-span-3 sm:col-span-2 text-right flex items-center justify-end gap-1">
                <span>PART DU TOP</span>
                <span
                  onClick={onOpenGlossary}
                  className="cursor-pointer text-cyan-400 hover:text-cyan-300"
                  title="Voir explication Part du Top"
                >
                  ℹ️
                </span>
              </div>
            </div>

            {/* Lignes du classement boursier avec VRAIS VOLUMES */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {products.map((product) => {
                const isGold = product.rank === 1;
                const isSilver = product.rank === 2;
                const isBronze = product.rank === 3;
                const shareOfLeader = Math.round((product.volume / topVolume) * 100);

                // Conversion dynamique selon l'unité choisie (L, cL, cols, casiers)
                const formattedVol = formatProductVolume(
                  product.volume,
                  unit,
                  product.name,
                  product.format
                );

                // Conversion de la vélocité horaire
                const formattedVel = formatProductVolume(
                  product.velocity,
                  unit,
                  product.name,
                  product.format
                );

                return (
                  <div
                    key={product.id}
                    className={`grid grid-cols-12 items-center p-3 rounded-xl border backdrop-blur-md transition-all group ${
                      isGold
                        ? 'border-amber-500/60 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-950 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                        : isSilver
                        ? 'border-slate-400/50 bg-gradient-to-r from-slate-400/10 via-slate-900 to-slate-950'
                        : isBronze
                        ? 'border-orange-500/40 bg-gradient-to-r from-orange-500/10 via-slate-900 to-slate-950'
                        : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70'
                    }`}
                  >
                    {/* 1. Rang */}
                    <div className="col-span-1 flex items-center justify-center">
                      <span
                        className={`size-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                          isGold
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                            : isSilver
                            ? 'bg-slate-300 text-slate-950'
                            : isBronze
                            ? 'bg-orange-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{product.rank}
                      </span>
                    </div>

                    {/* 2. Photo réelle + Nom + Marque */}
                    <div className="col-span-6 sm:col-span-5 pl-2 flex items-center gap-3">
                      <div className="size-11 sm:size-12 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 relative shadow-md">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="size-full object-cover p-0.5 group-hover:scale-110 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="size-5 text-amber-400" />
                        )}

                        {product.brandLogo && (
                          <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full bg-slate-950 p-0.5 border border-slate-700 shadow-md inline-flex items-center justify-center">
                            <img src={product.brandLogo} alt="" className="size-full object-contain" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-foreground group-hover:text-orange-400 transition-colors truncate">
                            {product.name}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono text-slate-400 border-slate-700 hidden lg:inline-flex shrink-0">
                            {product.symbol}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span className="text-slate-300 font-medium truncate">{product.brand}</span>
                          <span>•</span>
                          <span className="font-mono text-orange-400 font-semibold">{product.price != null ? `${product.price.toLocaleString('fr-FR')} FCFA` : 'Prix n/d'}</span>
                          {product.format && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="hidden sm:inline text-slate-500 font-mono text-[10px]">{product.format}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. VRAI VOLUME ÉCOULÉ (Converti en L / cL / cols / casiers) */}
                    <div className="col-span-2 sm:col-span-2 text-right">
                      <div className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {formattedVol.formatted}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {unit === 'casiers' && formattedVol.remainderCols !== undefined
                          ? `${formattedVol.fullPackages?.toLocaleString('fr-FR')} ${formattedVol.unitLabel} · ${formattedVol.remainderCols} col(s) restant(s)`
                          : unit !== 'cols'
                          ? `${product.volume.toLocaleString('fr-FR')} cols`
                          : 'Volume BD Réel'}
                      </div>
                    </div>

                    {/* 4. VÉLOCITÉ HORAIRE RÉELLE */}
                    <div className="col-span-2 sm:col-span-2 text-right hidden sm:block">
                      <div className="font-mono text-xs font-semibold text-slate-200">
                        {formattedVel.formatted} <span className="text-[10px] text-muted-foreground">/ h</span>
                      </div>
                      <div className={`mt-1 text-[10px] font-mono font-semibold ${product.growth == null ? 'text-slate-500' : product.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {product.growth == null ? 'var. n/d' : `${product.growth > 0 ? '+' : ''}${product.growth} %`}
                      </div>
                    </div>

                    {/* 5. Part du top leader */}
                    <div className="col-span-3 sm:col-span-2 text-right pl-2">
                      <div className="font-mono text-xs font-bold text-foreground">
                        {shareOfLeader}%
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isGold ? 'bg-amber-400' : isSilver ? 'bg-slate-300' : isBronze ? 'bg-orange-400' : 'bg-blue-500'
                          }`}
                          style={{ width: `${shareOfLeader}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* VUE 2 : VITRINE PHOTOS & CARTES PRODUITS (Showcase View) */}
        {viewMode === 'showcase' && (
          <motion.div
            key="showcase-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 max-h-[480px] overflow-y-auto pr-1"
          >
            {products.map((product) => {
              const formattedVol = formatProductVolume(product.volume, unit, product.name, product.format);
              return (
                <div
                  key={product.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/90 hover:border-orange-500/50 transition-all flex flex-col justify-between group shadow-md"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="size-5 rounded-md bg-slate-800 flex items-center justify-center font-mono text-[10px] font-bold text-amber-400">
                      #{product.rank}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-300">
                      {product.brand}
                    </Badge>
                  </div>

                  {/* Photo Haute Définition */}
                  <div className="my-3 h-28 w-full rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="size-10 text-slate-700" />
                    )}

                    {product.brandLogo && (
                      <span className="absolute top-2 right-2 size-6 rounded-full bg-slate-900 p-1 border border-slate-700 shadow-md">
                        <img src={product.brandLogo} alt="" className="size-full object-contain" />
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-mono text-xs font-bold text-foreground truncate group-hover:text-orange-400 transition-colors">
                      {product.name}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-orange-400 font-bold">{product.price != null ? `${product.price.toLocaleString('fr-FR')} F` : '—'}</span>
                      <span className="text-slate-400">{product.format || '—'}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-muted-foreground">Volume BD :</span>
                      <span className="font-bold text-foreground">{formattedVol.formatted}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* VUE 3 : RADAR DES VÉLOCITÉS HORAIRES */}
        {viewMode === 'velocity' && (
          <motion.div
            key="velocity-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 max-h-[480px] overflow-y-auto pr-1"
          >
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Activity className="size-4 text-cyan-400" />
                Vitesse d&apos;Écoulement Réelle : bouteilles débitées par heure d&apos;activité
              </span>
              <button onClick={onOpenGlossary} className="text-cyan-400 hover:underline">
                Comprendre la formule ℹ️
              </button>
            </div>

            {products.map((product) => {
              const formattedVel = formatProductVolume(product.velocity, unit, product.name, product.format);
              const velPct = Math.round((product.velocity / Math.max(0.1, ...products.map((x) => x.velocity))) * 100);

              return (
                <div
                  key={product.id}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="font-mono text-xs font-bold text-amber-400">#{product.rank}</span>
                    <div className="size-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {product.image ? (
                        <img src={product.image} alt="" className="size-full object-cover" />
                      ) : (
                        <Package className="size-4 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-foreground truncate">{product.name}</div>
                      <div className="text-[10px] text-muted-foreground">{product.brand}</div>
                    </div>
                  </div>

                  <div className="flex-1 max-w-xs hidden sm:block">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                        style={{ width: `${Math.min(100, velPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-emerald-400">{formattedVel.formatted} / h</div>
                    <div className="text-[10px] text-slate-500">{product.velocity} cols/h réels</div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
