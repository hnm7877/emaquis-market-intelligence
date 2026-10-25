'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Bot,
  Layers,
  Activity,
  Globe2,
  BarChart3,
  Share2,
  HelpCircle,
  ChevronDown,
  Swords,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockTickerHeader } from '@/components/autonomous/StockTickerHeader';
import { ThreeVgpuCanvas } from '@/components/autonomous/ThreeVgpuCanvas';
import { LiveTradingLadder } from '@/components/autonomous/LiveTradingLadder';
import { GeographicHierarchyTree } from '@/components/autonomous/GeographicHierarchyTree';
import { StockChartPanel } from '@/components/autonomous/StockChartPanel';
import { AgentHudConsole, AgentDirective } from '@/components/autonomous/AgentHudConsole';
import { MarketTermsModal } from '@/components/autonomous/MarketTermsModal';
import { RechartsShowcaseSuite } from '@/components/autonomous/RechartsShowcaseSuite';
import { BreweryCategoryDuel } from '@/components/autonomous/BreweryCategoryDuel';
import { MultiCountryNetworkMap } from '@/components/autonomous/MultiCountryNetworkMap';
import { AutonomousAgentNewsModal } from '@/components/autonomous/AutonomousAgentNewsModal';
import { BourseKpiStrip } from '@/components/autonomous/BourseKpiStrip';
import {
  useProductsQuery,
  useGeographyQuery,
  useMarketOverview,
  useBrandsQuery,
  useCategoriesQuery,
} from '@/hooks/market/useMarketQueries';
import { useMarketFilterStore } from '@/stores/useMarketFilterStore';
import { useMarketRealtimeStore } from '@/stores/useMarketRealtimeStore';
import { useBourseUiStore, type BourseTab } from '@/stores/useBourseUiStore';
import { PAYS } from '@/constants/countries';
import { DISPLAY_VOLUME_UNITS, formatProductVolume, aggregateCategoryPackages } from '@/utils/productVolumeConverter';

const NAV_TABS: { id: BourseTab; label: string; icon: typeof Activity }[] = [
  { id: 'ladder', label: 'Bourse & carte', icon: Activity },
  { id: 'recharts', label: 'Graphiques', icon: BarChart3 },
  { id: 'duel', label: 'Duel des brasseries', icon: Swords },
  { id: 'countries', label: 'Multi-pays', icon: Globe2 },
  { id: 'geography', label: 'Pyramide territoriale', icon: Layers },
];

/**
 * Bourse des boissons : toutes les données arrivent par WebSocket (mi:data) et sont gardées
 * par React Query ; aucune minuterie de rechargement sur cette page. Les préférences
 * d'affichage (onglet, unité, carte) sont mémorisées par un store Zustand.
 */
export default function AutonomousDashboardPage() {
  const reduceMotion = useReducedMotion();
  const tab = useBourseUiStore((s) => s.tab);
  const setTab = useBourseUiStore((s) => s.setTab);
  const volumeUnit = useBourseUiStore((s) => s.unit);
  const setVolumeUnit = useBourseUiStore((s) => s.setUnit);
  const territory = useBourseUiStore((s) => s.territory);
  const setTerritory = useBourseUiStore((s) => s.setTerritory);
  useEffect(() => {
    void useBourseUiStore.persist.rehydrate();
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('Bières');
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isConnected = useMarketRealtimeStore((s) => s.isConnected);
  const liveTotals = useMarketRealtimeStore((s) => s.liveTotals);

  // Filtre pays synchronisé avec le store global de l'application
  const filters = useMarketFilterStore((s) => s.filters);
  const setFilter = useMarketFilterStore((s) => s.setFilter);
  const selectedCountryCode = Array.isArray(filters.country)
    ? filters.country.length === 1
      ? filters.country[0]
      : filters.country
    : filters.country || 'all';

  // Données poussées par le serveur (WebSocket), mises en cache par React Query
  const { data: productsData, isLoading: isProductsLoading } = useProductsQuery();
  const dbProducts = useMemo(() => productsData?.products || [], [productsData]);
  const { data: geoData } = useGeographyQuery();
  const { data: overviewData, isLoading: isOverviewLoading } = useMarketOverview();
  const { data: brandsData } = useBrandsQuery();
  const { data: categoriesData } = useCategoriesQuery();

  // Catégorie affichée : toujours une catégorie réelle de la base
  useEffect(() => {
    if (categoriesData?.categories?.length > 0) {
      const exists = categoriesData.categories.some((c: any) => c.name === selectedCategory);
      if (!exists) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- aligne la sélection sur les catégories reçues
        setSelectedCategory(categoriesData.categories[0].name);
      }
    }
  }, [categoriesData, selectedCategory]);

  const kpis: any = overviewData?.kpis;
  const zones: any[] = useMemo(() => geoData?.zones || [], [geoData]);

  const totalRealVolume = useMemo(() => {
    if (kpis?.salesVolume) return kpis.salesVolume;
    return zones.reduce((sum: number, z: any) => sum + (Number(z.volume) || 0), 0);
  }, [kpis, zones]);

  const totalRealRevenue = useMemo(() => {
    if (kpis?.revenue) return kpis.revenue;
    return zones.reduce((sum: number, z: any) => sum + (Number(z.revenue) || 0), 0);
  }, [kpis, zones]);

  const totalRealEstablishments = useMemo(
    () =>
      kpis?.activePos ||
      geoData?.totalAnalyzedPos ||
      geoData?.establishments?.length ||
      zones.reduce((sum: number, z: any) => sum + (Number(z.posCount) || 0), 0) ||
      0,
    [kpis, geoData, zones],
  );

  // Volume affiché selon l'unité (casiers : vrais conditionnements produit par produit)
  const volumeKpi = useMemo(() => {
    if (volumeUnit === 'casiers' && dbProducts.length > 0) {
      const agg = aggregateCategoryPackages(dbProducts as any, 'Total Réseau');
      return { value: agg.effectivePackages, format: (n: number) => Math.round(n).toLocaleString('fr-FR'), unitLabel: 'casiers', formatted: agg.formatted };
    }
    const f = formatProductVolume(totalRealVolume, volumeUnit, 'Total Réseau', '65cl');
    const unitLabel = DISPLAY_VOLUME_UNITS.find((u) => u.id === volumeUnit)?.shortLabel.toLowerCase() || volumeUnit;
    return {
      value: totalRealVolume,
      format: (n: number) => formatProductVolume(n, volumeUnit, 'Total Réseau', '65cl').formatted,
      unitLabel,
      formatted: f.formatted,
    };
  }, [volumeUnit, dbProducts, totalRealVolume]);

  const leaderProduct = dbProducts[0];
  const challengerProduct = dbProducts[1];

  const showToast = useCallback((msg: string, ms = 3500) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage((cur) => (cur === msg ? null : cur)), ms);
  }, []);

  const handleDirectiveApply = (directive: AgentDirective) => showToast(`Directive appliquée : ${directive.label}`);
  const handleOvertakeAlert = (winner: string, loser: string) => showToast(`Bourse : ${winner} a dépassé ${loser} au classement`, 4000);

  const copySummary = () => {
    const lines = [
      'SYNTHÈSE BOURSE E-MAQUIS',
      leaderProduct ? `- N° 1 : ${leaderProduct.name} (${leaderProduct.brand})` : null,
      challengerProduct ? `- Challenger : ${challengerProduct.name} (${challengerProduct.brand})` : null,
      `- Volume (${volumeUnit}) : ${volumeKpi.formatted}`,
      `- Maquis actifs : ${totalRealEstablishments.toLocaleString('fr-FR')}`,
      `- Chiffre d'affaires : ${(Math.round((totalRealRevenue / 1_000_000) * 10) / 10).toLocaleString('fr-FR')} M FCFA`,
    ].filter(Boolean);
    navigator.clipboard?.writeText(lines.join('\n'));
    showToast('Synthèse copiée dans le presse-papiers', 3000);
  };

  const countryValue = Array.isArray(selectedCountryCode) ? (selectedCountryCode.length === 1 ? selectedCountryCode[0] : 'multi') : selectedCountryCode;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-12">
      {/* 1. Ruban de bourse (vrais produits, unité choisie) */}
      <StockTickerHeader apiProducts={dbProducts} unit={volumeUnit} />

      {/* 2. En-tête */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-md p-4 shadow-xl space-y-4"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${isConnected ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                <span className={`size-1.5 rounded-full ${isConnected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'En direct' : 'Reconnexion…'}
              </span>
              <span className="text-slate-500">
                {dbProducts.length > 0 && `${dbProducts.length.toLocaleString('fr-FR')} références · `}
                {zones.length.toLocaleString('fr-FR')} communes
              </span>
            </div>
            <h1 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Sparkles className="size-5 md:size-6 text-amber-500" />
              Bourse des boissons
            </h1>
            <p className="text-xs text-slate-400">Classement des produits, carte des communes et pistes de vente, mis à jour en direct.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pays (filtre global de l'application) */}
            <label className="flex items-center gap-1.5 h-8 px-2 rounded-lg bg-slate-900 border border-slate-800">
              <Globe2 className="size-3.5 text-amber-400 shrink-0" />
              <span className="sr-only">Pays</span>
              <select
                value={countryValue}
                onChange={(e) => {
                  if (e.target.value !== 'multi') setFilter('country', e.target.value);
                }}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer max-w-[170px]"
              >
                <option value="all" className="bg-slate-950">Tous les pays</option>
                {countryValue === 'multi' && (
                  <option value="multi" className="bg-slate-950">
                    {(selectedCountryCode as string[]).length} pays sélectionnés
                  </option>
                )}
                {PAYS.map((p) => (
                  <option key={p.code} value={p.code} className="bg-slate-950">
                    {p.flag} {p.name.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>

            {/* Unité de volume */}
            <div className="relative flex items-center h-8 p-0.5 rounded-lg bg-slate-900 border border-slate-800" role="radiogroup" aria-label="Unité de volume">
              {DISPLAY_VOLUME_UNITS.map((u) => {
                const isSelected = volumeUnit === u.id;
                return (
                  <button
                    key={u.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setVolumeUnit(u.id)}
                    title={u.description}
                    className={`relative px-2.5 h-full rounded-md text-xs transition-colors ${isSelected ? 'text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {isSelected && (
                      <motion.span layoutId="bourse-unit" className="absolute inset-0 rounded-md bg-amber-500" transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }} />
                    )}
                    <span className="relative">{u.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <Button size="sm" onClick={() => setIsNewsModalOpen(true)} className="h-8 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 gap-1.5">
              <Radio className="size-3.5" />
              Flash terrain IA
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsGlossaryOpen(true)} className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 gap-1.5">
              <HelpCircle className="size-3.5" />
              Lexique
            </Button>
            <Button size="sm" onClick={copySummary} className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold gap-1.5">
              <Share2 className="size-3.5" />
              Copier la synthèse
            </Button>
          </div>
        </div>

        {/* Indicateurs clés (animés à chaque mise à jour poussée par le serveur) */}
        <BourseKpiStrip
          loading={isOverviewLoading && isProductsLoading}
          volume={volumeKpi}
          revenue={totalRealRevenue}
          establishments={totalRealEstablishments}
          growth={{ volume: kpis?.volumeGrowth ?? kpis?.growthRate, revenue: kpis?.revenueGrowth, pos: kpis?.posGrowth }}
          live={{ connected: isConnected, sales: liveTotals.sales, amount: liveTotals.amount }}
          leader={leaderProduct}
          challenger={challengerProduct}
        />

        {/* Onglets */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1" aria-label="Sections de la bourse">
            {NAV_TABS.map((t) => {
              const isCurrent = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    isCurrent ? 'text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  {isCurrent && (
                    <motion.span layoutId="bourse-tab" className="absolute inset-0 rounded-lg bg-amber-500 shadow-md shadow-amber-500/20" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />
                  )}
                  <Icon className="relative size-3.5" />
                  <span className="relative">{t.label}</span>
                </button>
              );
            })}
          </nav>
          <button
            onClick={() => setIsConsoleOpen((v) => !v)}
            className="shrink-0 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 px-2 py-1 rounded-lg hover:bg-slate-900 transition-colors"
            aria-expanded={isConsoleOpen}
          >
            <Bot className="size-3.5 text-amber-400" />
            <span className="hidden sm:inline">Console IA</span>
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${isConsoleOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isConsoleOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <AgentHudConsole onApplyDirective={handleDirectiveApply} isBuilding={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-5 right-5 z-50 bg-slate-950 border border-amber-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs"
          >
            <Bot className="size-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. CONTENU SELON L'ONGLET SÉLECTIONNÉ */}
      <AnimatePresence mode="wait">
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>

      {/* ONGLET 1 : BOURSE, 3D SPATIAL & LIVE TRADING LADDER */}
      {tab === 'ladder' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Three.js 3D VGPU Spatial Mesh */}
            <div className="xl:col-span-7 space-y-3">
              <ThreeVgpuCanvas
                activeNode={territory}
                onNodeSelect={setTerritory}
                geoData={geoData}
                unit={volumeUnit}
              />
            </div>

            {/* Live Stock Trading Ladder branché sur la BD avec Auto-Swipe, conversion L/cL et explications */}
            <div className="xl:col-span-5">
              <LiveTradingLadder
                apiProducts={dbProducts}
                unit={volumeUnit}
                onOpenGlossary={() => setIsGlossaryOpen(true)}
                onOvertakeAlert={handleOvertakeAlert}
              />
            </div>
          </div>

          {/* Graphiques Intrajournaliers */}
          <StockChartPanel
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            categoriesData={categoriesData}
          />
        </div>
      )}

      {/* ONGLET 2 : SUITE RECHARTS COMPLÈTE (10 MODÈLES DE LA DOC) */}
      {tab === 'recharts' && (
        <RechartsShowcaseSuite
          unit={volumeUnit}
          onOpenGlossary={() => setIsGlossaryOpen(true)}
          overviewData={overviewData}
          productsData={productsData}
          brandsData={brandsData}
          categoriesData={categoriesData}
          geoData={geoData}
        />
      )}

      {/* ONGLET 3 : DUEL BRASSERIES & PRODUITS EN SOUFFRANCE */}
      {tab === 'duel' && (
        <BreweryCategoryDuel
          unit={volumeUnit}
          onOpenGlossary={() => setIsGlossaryOpen(true)}
          productsData={productsData}
          brandsData={brandsData}
          categoriesData={categoriesData}
        />
      )}

      {/* ONGLET 4 : RÉSEAU MULTI-PAYS (GLOBALSALE) */}
      {tab === 'countries' && (
        <MultiCountryNetworkMap
          unit={volumeUnit}
          onOpenGlossary={() => setIsGlossaryOpen(true)}
          overviewData={overviewData}
          geoData={geoData}
          selectedCountry={selectedCountryCode}
          onSelectCountry={(c) => setFilter('country', c)}
        />
      )}

      {/* ONGLET 5 : PYRAMIDE HIÉRARCHIQUE TERRITORIALE BD */}
      {tab === 'geography' && (
        <GeographicHierarchyTree
          geoData={geoData}
          onSelectTerritory={(name) => {
            setTerritory(name);
          }}
        />
      )}

      </motion.div>
      </AnimatePresence>

      {/* Modal du Lexique Explicatif des Termes (Vélocité, Volume, Part du Top...) */}
      <MarketTermsModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />

      {/* Modal des Flashs Infos du Terrain (Génération Autonome DeerFlow) */}
      <AutonomousAgentNewsModal
        isOpen={isNewsModalOpen}
        onClose={() => setIsNewsModalOpen(false)}
        productsData={productsData}
        geoData={geoData}
        overviewData={overviewData}
        brandsData={brandsData}
        totalRealEstablishments={totalRealEstablishments}
      />
    </div>
  );
}
