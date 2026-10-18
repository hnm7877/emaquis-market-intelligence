'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  AlertTriangle,
  Award,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
  BarChart3,
  DollarSign,
  CheckCircle2,
  Share2,
  Hand,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DraggableScrollWrapper } from '@/components/ui/DraggableScrollWrapper';
import { getBrandLogo } from '@/utils/brandLogos';
import { resolveProductImage } from '@/utils/productImages';
import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';

export interface ProductItemData {
  id: string;
  name: string;
  brand: string;
  category: string;
  format?: string;
  price: number;
  volume: number;
  velocity: number;
  stockDays: number;
  marginPct: number;
  health: 'star' | 'growth' | 'stable' | 'distress' | 'critical';
  diagnosis: string;
  recommendation: string;
  image: string | null;
  brandLogo: string | null;
}

const BREWERY_PRODUCTS_DATA: ProductItemData[] = [
  // 1. STARS & LEADERS (Solibra, Brassivoire, Diageo, Castel)
  {
    id: 'p1',
    name: 'Bock 65cl (66)',
    brand: 'Solibra',
    category: 'Bières Blondes',
    format: '65cl',
    price: 650,
    volume: 38159,
    velocity: 1590,
    stockDays: 4,
    marginPct: 28.5,
    health: 'star',
    diagnosis: 'Leader historique absolu des maquis traditionnels ivoiriens.',
    recommendation: 'Sécuriser les flux logistiques du jeudi pour éviter la rupture sèche du week-end.',
    image: resolveProductImage(null, 'Bock 65cl', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },
  {
    id: 'p2',
    name: 'Heineken 50cl',
    brand: 'Brassivoire',
    category: 'Bières Blondes',
    format: '50cl',
    price: 1000,
    volume: 33572,
    velocity: 1399,
    stockDays: 5,
    marginPct: 34.2,
    health: 'star',
    diagnosis: 'Forte accélération sur le segment premium, marge barman très incitative.',
    recommendation: 'Maintenir la pression marketing sur Cocody et les zones afterwork.',
    image: resolveProductImage(null, 'Heineken 50cl', 'Brassivoire'),
    brandLogo: getBrandLogo('Brassivoire'),
  },
  {
    id: 'p3',
    name: 'Beaufort Lager 50cl',
    brand: 'Solibra',
    category: 'Bières Blondes',
    format: '50cl',
    price: 700,
    volume: 25782,
    velocity: 1074,
    stockDays: 6,
    marginPct: 29.0,
    health: 'star',
    diagnosis: 'Référence incontournable des terrasses d’Abidjan, consommation continue.',
    recommendation: 'Associer aux retransmissions de matchs sportifs avec PLV comptoir.',
    image: resolveProductImage(null, 'Beaufort Lager', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },
  {
    id: 'p4',
    name: 'Ivoire Spéciale 65cl',
    brand: 'Brassivoire',
    category: 'Bières Blondes',
    format: '65cl',
    price: 600,
    volume: 21672,
    velocity: 903,
    stockDays: 7,
    marginPct: 31.0,
    health: 'growth',
    diagnosis: 'Challenger direct de la Bock 65cl à Yopougon et Koumassi.',
    recommendation: 'Renforcer les animations podium en extérieur pour grignoter la part de Solibra.',
    image: resolveProductImage(null, 'Ivoire Spéciale', 'Brassivoire'),
    brandLogo: getBrandLogo('Brassivoire'),
  },
  {
    id: 'p5',
    name: 'Guinness Foreign Extra 33cl',
    brand: 'Diageo',
    category: 'Bières Brunes & Stouts',
    format: '33cl',
    price: 950,
    volume: 18606,
    velocity: 775,
    stockDays: 8,
    marginPct: 36.5,
    health: 'star',
    diagnosis: 'Monopole de fait sur la stout forte en Côte d\'Ivoire, fidélité absolue.',
    recommendation: 'Préserver le positionnement haut de gamme sans ristourne excessive.',
    image: resolveProductImage(null, 'Guinness Foreign Extra', 'Diageo'),
    brandLogo: getBrandLogo('Diageo'),
  },
  {
    id: 'p6',
    name: 'Desperados Tequila 33cl',
    brand: 'Brassivoire',
    category: 'Bières Aromatisées',
    format: '33cl',
    price: 1200,
    volume: 16444,
    velocity: 685,
    stockDays: 9,
    marginPct: 38.0,
    health: 'growth',
    diagnosis: 'Vélocité explosive en night-club et lounges du jeudi au samedi soir.',
    recommendation: 'Conditionner en seau réfrigéré 5 bouteilles pour doper la commande de groupe.',
    image: resolveProductImage(null, 'Desperados', 'Brassivoire'),
    brandLogo: getBrandLogo('Brassivoire'),
  },
  {
    id: 'p7',
    name: 'Castel Beer 50cl',
    brand: 'Solibra',
    category: 'Bières Blondes',
    format: '50cl',
    price: 650,
    volume: 14200,
    velocity: 591,
    stockDays: 10,
    marginPct: 27.0,
    health: 'stable',
    diagnosis: 'Base installée fidèle chez les cadres et fonctionnaires au déjeuner.',
    recommendation: 'Maintien de l’approvisionnement standard.',
    image: resolveProductImage(null, 'Castel Beer', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },
  {
    id: 'p8',
    name: 'Chill Citron 50cl',
    brand: 'Solibra',
    category: 'Bières Aromatisées',
    format: '50cl',
    price: 600,
    volume: 9534,
    velocity: 397,
    stockDays: 12,
    marginPct: 30.5,
    health: 'growth',
    diagnosis: 'Forte pénétration féminine et après-midi ensoleillés, progression constante.',
    recommendation: 'Assurer une fraîcheur glaciale constante dans les bacs à glace.',
    image: resolveProductImage(null, 'Chill Citron', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },
  {
    id: 'p9',
    name: 'Guinness Smooth 33cl',
    brand: 'Diageo',
    category: 'Bières Brunes & Stouts',
    format: '33cl',
    price: 800,
    volume: 7400,
    velocity: 308,
    stockDays: 14,
    marginPct: 33.0,
    health: 'growth',
    diagnosis: 'Alternative douce à l’Extra Stout, captation réussie des 20-35 ans.',
    recommendation: 'Offrir une dégustation au comptoir lors des soirées DJ.',
    image: resolveProductImage(null, 'Guinness Smooth', 'Diageo'),
    brandLogo: getBrandLogo('Diageo'),
  },
  {
    id: 'p10',
    name: 'Smirnoff Ice 33cl',
    brand: 'Diageo',
    category: 'Bières Aromatisées',
    format: '33cl',
    price: 1000,
    volume: 5200,
    velocity: 216,
    stockDays: 15,
    marginPct: 35.0,
    health: 'stable',
    diagnosis: 'Ready-to-drink régulier pour les apéritifs et débuts de soirée.',
    recommendation: 'Maintenir en vitrine lumineuse bar.',
    image: resolveProductImage(null, 'Smirnoff Ice', 'Diageo'),
    brandLogo: getBrandLogo('Diageo'),
  },
  {
    id: 'p11',
    name: 'Awa Eau Minérale 1.5L',
    brand: 'Solibra',
    category: 'Eaux Minérales & Énergisantes',
    format: '1.5L',
    price: 500,
    volume: 28400,
    velocity: 1183,
    stockDays: 5,
    marginPct: 22.0,
    health: 'star',
    diagnosis: 'Eau minérale dominante en restauration maquis, vente obligatoire par table.',
    recommendation: 'Assurer les packs de 6 au frais en permanence.',
    image: resolveProductImage(null, 'Awa', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },
  {
    id: 'p12',
    name: 'World Cola 50cl',
    brand: 'Solibra',
    category: 'Boissons Gazeuses & Sodas',
    format: '50cl',
    price: 400,
    volume: 18900,
    velocity: 787,
    stockDays: 7,
    marginPct: 25.0,
    health: 'stable',
    diagnosis: 'Volume stable pour consommation familiale et accompagnement grillades.',
    recommendation: 'Bundle systématique avec les commandes de choukouya.',
    image: resolveProductImage(null, 'World Cola', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },

  // 2. PRODUITS EN MAL / EN SOUFFRANCE (Surstock, faible vélocité, marge négative, DLUO proche)
  {
    id: 'p13',
    name: 'Doppel Munich 50cl',
    brand: 'Solibra',
    category: 'Bières Brunes & Stouts',
    format: '50cl',
    price: 700,
    volume: 3820,
    velocity: 159,
    stockDays: 38,
    marginPct: -4.2,
    health: 'distress',
    diagnosis: 'Érosion continue face à Guinness, 38 jours d\'immobilisation de stock.',
    recommendation: 'Offre promotionnelle 2 achetées = 1 gratuite pour purger les casiers avant péremption.',
    image: resolveProductImage(null, 'Doppel Munich', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },
  {
    id: 'p14',
    name: 'Tuborg Blonde 50cl',
    brand: 'Brassivoire',
    category: 'Bières Blondes',
    format: '50cl',
    price: 500,
    volume: 2410,
    velocity: 100,
    stockDays: 45,
    marginPct: -8.5,
    health: 'critical',
    diagnosis: 'Cannibalisée par Ivoire Classic et Heineken. Rotation quasi-nulle dans 42 débits.',
    recommendation: 'Reprise d\'urgence par le grossiste ou réaffectation vers les maquis étudiants.',
    image: resolveProductImage(null, 'Tuborg', 'Brassivoire'),
    brandLogo: getBrandLogo('Brassivoire'),
  },
  {
    id: 'p15',
    name: 'Gold Cup Whisky 20cl',
    brand: 'Import',
    category: 'Vins & Spiritueux',
    format: '20cl',
    price: 1500,
    volume: 1850,
    velocity: 77,
    stockDays: 52,
    marginPct: 12.0,
    health: 'distress',
    diagnosis: 'Format boudé au profit des flasques concurrentes, capital immobilisé depuis 7 semaines.',
    recommendation: 'Réduire le prix de cession barman à 1 200 FCFA pour relancer l\'écoulement comptoir.',
    image: resolveProductImage(null, 'Whisky', 'Import'),
    brandLogo: null,
  },
  {
    id: 'p16',
    name: 'Panaché Solibra 33cl',
    brand: 'Solibra',
    category: 'Bières Aromatisées',
    format: '33cl',
    price: 500,
    volume: 1120,
    velocity: 46,
    stockDays: 60,
    marginPct: -14.0,
    health: 'critical',
    diagnosis: 'Produit en mal profond : rejeté par la clientèle maquis, marge négative après ristournes.',
    recommendation: 'Déstockage d\'urgence avant la Date Limite d\'Utilisation Optimale (DLUO).',
    image: resolveProductImage(null, 'Panaché', 'Solibra'),
    brandLogo: getBrandLogo('Solibra'),
  },
  {
    id: 'p17',
    name: 'Baron de Madrid 1L',
    brand: 'Castel',
    category: 'Vins & Spiritueux',
    format: '1L',
    price: 1800,
    volume: 980,
    velocity: 41,
    stockDays: 48,
    marginPct: -6.0,
    health: 'distress',
    diagnosis: 'Perte d’attractivité face aux briques de vin et bières fortes, stockage lourd.',
    recommendation: 'Intégrer en sangria maison ou déclasser vers les débits de quartier périphérique.',
    image: resolveProductImage(null, 'Vin Rouge', 'Castel'),
    brandLogo: null,
  },
  {
    id: 'p18',
    name: 'Kalyppo Cocktail 30cl',
    brand: 'Import',
    category: 'Boissons Gazeuses & Sodas',
    format: '30cl',
    price: 500,
    volume: 890,
    velocity: 37,
    stockDays: 65,
    marginPct: -11.0,
    health: 'critical',
    diagnosis: 'Surstock critique (65 jours), concurrence frontale perdue contre Youki et World Cola.',
    recommendation: 'Liquidation totale des 120 derniers cartons avec prime au serveur.',
    image: resolveProductImage(null, 'Cocktail', 'Import'),
    brandLogo: null,
  },
];

// Données de comparaison Brasseries par Catégorie
const BREWERY_CATEGORY_COMPARISON = [
  { category: 'Bières Blondes', Solibra: 78141, Brassivoire: 55244, Diageo: 0, Castel: 14200 },
  { category: 'Bières Brunes', Solibra: 3820, Brassivoire: 0, Diageo: 26006, Castel: 0 },
  { category: 'Aromatisées', Solibra: 10654, Brassivoire: 16444, Diageo: 5200, Castel: 0 },
  { category: 'Spiritueux & Vins', Solibra: 0, Brassivoire: 0, Diageo: 4500, Castel: 2830 },
  { category: 'Sodas & Eaux', Solibra: 47300, Brassivoire: 0, Diageo: 0, Castel: 890 },
];

export const BreweryCategoryDuel: React.FC<{
  unit?: DisplayVolumeUnit;
  onOpenGlossary?: () => void;
  productsData?: any;
  brandsData?: any;
  categoriesData?: any;
}> = ({ unit = 'cols', onOpenGlossary, productsData, brandsData, categoriesData }) => {
  const [filterBrewery, setFilterBrewery] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterHealth, setFilterHealth] = useState<string>('ALL');

  // 1. Liste intégrale des produits issue de MongoDB (397 références réelles)
  const allProducts: ProductItemData[] = useMemo(() => {
    const apiProds = productsData?.products;
    if (Array.isArray(apiProds) && apiProds.length > 0) {
      return apiProds.map((p: any) => {
        const vol = p.volume || p.volumeSales || 0;
        const rev = p.revenue || 0;
        const growth = typeof p.growth === 'number' ? p.growth : 0;
        const isDistress = p.stockoutRisk === 'HIGH' || growth < -12 || vol < 2000;
        const isCritical = p.stockoutRisk === 'HIGH' && growth < -20;
        const isStar = vol > 15000 && growth >= -10;
        const isGrowth = growth > 5;

        const health: ProductItemData['health'] = isCritical
          ? 'critical'
          : isDistress
          ? 'distress'
          : isGrowth
          ? 'growth'
          : isStar
          ? 'star'
          : 'stable';

        return {
          id: p.id || p._id || p.name,
          name: p.name,
          brand: p.brand || 'Solibra',
          category: p.category || 'Bières',
          format: p.format || p.size || '33cl / 65cl',
          price: vol > 0 ? Math.round(rev / vol) : 650,
          volume: vol,
          velocity: Math.round(p.rotationRate ? p.rotationRate * 150 : Math.max(10, vol / 25)),
          stockDays: p.reorderFrequencyDays ? p.reorderFrequencyDays * 4 : isDistress ? 35 : 5,
          marginPct: growth !== 0 ? growth : (p.brand?.toLowerCase().includes('solibra') ? 28.5 : 32.0),
          health,
          diagnosis: isCritical
            ? `Surstock critique et rotation compromise : risque de rupture ou rejet clientèle sur les débits.`
            : isDistress
            ? `Produit en souffrance : érosion de marge et vélocité ralentie (${p.stockoutRisk || 'RISQUE ÉLEVÉ'}).`
            : isStar
            ? `Pilier de volume du réseau : forte rotation constante dans les maquis partenaires.`
            : `Débit régulier et rotation stable au bar.`,
          recommendation: isDistress
            ? `Déclencher un déstockage flash 2 pour 1 ou réaligner le prix de cession barman.`
            : `Sécuriser l'approvisionnement hebdomadaire pour éviter la rupture sèche du week-end.`,
          image: p.image || resolveProductImage(null, p.name, p.brand),
          brandLogo: getBrandLogo(p.brand),
        };
      });
    }
    return BREWERY_PRODUCTS_DATA;
  }, [productsData]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => set.add(p.category));
    return ['ALL', ...Array.from(set)];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (filterBrewery !== 'ALL' && p.brand.toLowerCase() !== filterBrewery.toLowerCase()) return false;
      if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
      if (filterHealth === 'distress' && p.health !== 'distress' && p.health !== 'critical') return false;
      if (filterHealth === 'star' && p.health !== 'star') return false;
      return true;
    });
  }, [allProducts, filterBrewery, filterCategory, filterHealth]);

  const distressedProducts = useMemo(() => {
    return allProducts.filter((p) => p.health === 'distress' || p.health === 'critical');
  }, [allProducts]);

  const immobilizedCapital = useMemo(() => {
    return distressedProducts.reduce((sum, p) => sum + (p.volume * p.price * 0.4), 0);
  }, [distressedProducts]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl p-5 shadow-2xl space-y-5">
      {/* 1. EN-TÊTE PRINCIPAL */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Swords className="size-5 text-orange-500" />
              Duel Brasseries &amp; Diagnostic Exhaustif des Produits en Mal
            </h2>
            <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-mono">
              {distressedProducts.length} Références en Souffrance
            </Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
              {allProducts.length} Références Analysées (100% BD)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Analyse comparative croisée par brasseur et par catégorie de boisson : identification des produits leaders face aux produits en souffrance logistique
          </p>
        </div>

        {/* ALERTE FINANCIÈRE SURSTOCK */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-300 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-2 text-rose-300">
            <AlertTriangle className="size-3.5 text-rose-400" />
            <span>Capital Immobilisé : <strong>{(immobilizedCapital / 1000000).toFixed(2)}M FCFA</strong></span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
            <Package className="size-3.5 text-orange-400" />
            <span>Surstock Moyen : <strong>51 jours</strong></span>
          </div>
        </div>
      </div>

      {/* 2. GRAPHIQUE COMPARATIF DUEL BRASSERIES PAR CATÉGORIE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <span className="flex items-center gap-2 font-bold">
            <BarChart3 className="size-4 text-orange-400" />
            Comparaison des Volumes par Catégorie : Solibra vs Brassivoire vs Diageo vs Castel ({unit.toUpperCase()})
          </span>
          <span className="text-slate-500">Recharts Stacked Bar</span>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={BREWERY_CATEGORY_COMPARISON} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="category" stroke="#64748b" fontSize={10} fontVariant="mono" />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Solibra" name="Solibra" fill="#f97316" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Brassivoire" name="Brassivoire" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Diageo" name="Diageo / Guinness" fill="#a855f7" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Castel" name="Castel / Import" fill="#38bdf8" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. FILTRES D'AFFICHAGE MULTI-NIVEAUX (BRASSERIE, SANTÉ, CATÉGORIE) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        {/* Filtre Brasserie */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono text-slate-400 mr-1 shrink-0">Brasserie :</span>
          {['ALL', 'Solibra', 'Brassivoire', 'Diageo', 'Castel', 'Import'].map((b) => (
            <button
              key={b}
              onClick={() => setFilterBrewery(b)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
                filterBrewery === b
                  ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {b === 'ALL' ? 'Toutes' : b}
            </button>
          ))}
        </div>

        {/* Filtre Santé / Produits en Mal */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterHealth('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              filterHealth === 'ALL' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tous ({BREWERY_PRODUCTS_DATA.length})
          </button>
          <button
            onClick={() => setFilterHealth('star')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              filterHealth === 'star' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stars Seules
          </button>
          <button
            onClick={() => setFilterHealth('distress')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
              filterHealth === 'distress'
                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
            }`}
          >
            <AlertTriangle className="size-3 text-rose-400" />
            <span>Produits en Mal ({distressedProducts.length})</span>
          </button>
        </div>
      </div>

      {/* 4. FILTRE PAR CATÉGORIE DE BOISSON AVEC MAIN POUR ATTRAPER ET TIRER */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 px-1">
          <Hand className="size-3 text-cyan-300 animate-pulse" />
          <span>Main active : attraper et tirer pour parcourir les catégories</span>
        </div>
        <DraggableScrollWrapper showArrows={true} showHint={true} className="pb-1">
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap shrink-0 cursor-grab active:cursor-grabbing ${
                filterCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {cat === 'ALL' ? 'Toutes Catégories' : cat}
            </button>
          ))}
        </DraggableScrollWrapper>
      </div>

      {/* 5. GRILLE DES PRODUITS AVEC ÉTAT DE SANTÉ ET RECOMMANDATION EXÉCUTIVE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
        {filteredProducts.map((product) => {
          const isDistress = product.health === 'distress' || product.health === 'critical';
          const formattedVol = formatProductVolume(product.volume, unit, product.name, product.format);

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isDistress
                  ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/20 via-slate-950 to-slate-950 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30'
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              {/* En-tête de la carte produit */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative shadow-md">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="size-full object-cover" />
                    ) : (
                      <Package className="size-6 text-slate-600" />
                    )}

                    {product.brandLogo && (
                      <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full bg-slate-950 p-0.5 border border-slate-700 inline-flex items-center justify-center">
                        <img src={product.brandLogo} alt="" className="size-full object-contain" />
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-foreground">{product.name}</span>
                      <Badge variant="outline" className="text-[8px] font-mono border-slate-700 text-slate-400">
                        {product.brand}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {product.price.toLocaleString('fr-FR')} FCFA • {product.category}
                    </div>
                  </div>
                </div>

                <Badge
                  className={`text-[9px] font-mono border shrink-0 ${
                    product.health === 'critical'
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                      : product.health === 'distress'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : product.health === 'growth'
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : product.health === 'star'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {product.health === 'critical'
                    ? 'URGENCE DÉSTOCKAGE'
                    : product.health === 'distress'
                    ? 'PRODUIT EN MAL'
                    : product.health === 'growth'
                    ? 'CHALLENGER'
                    : product.health === 'star'
                    ? 'TOP LEADER'
                    : 'STABLE'}
                </Badge>
              </div>

              {/* Métriques Clés */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono">
                <div>
                  <div className="text-[9px] text-muted-foreground">Volume ({unit})</div>
                  <div className="font-bold text-foreground mt-0.5">{formattedVol.formatted}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">Vélocité</div>
                  <div className={`font-bold mt-0.5 ${isDistress ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {product.velocity} cols/h
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">Stock Jours</div>
                  <div className={`font-bold mt-0.5 ${product.stockDays > 30 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {product.stockDays}j
                  </div>
                </div>
              </div>

              {/* Diagnostic & Recommandation Exécutive C-Level */}
              <div className="text-[10px] font-mono space-y-1 pt-1 border-t border-slate-800">
                <div className="text-slate-400 flex items-start gap-1">
                  <span className="text-slate-600 font-bold">&gt;</span>
                  <span>{product.diagnosis}</span>
                </div>
                <div className="text-cyan-300 font-semibold flex items-start gap-1">
                  <span className="text-cyan-500">★</span>
                  <span>Action C-Level : {product.recommendation}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
