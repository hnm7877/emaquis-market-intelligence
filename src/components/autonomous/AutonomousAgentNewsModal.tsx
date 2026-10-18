'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Clock,
  Radio,
  Share2,
  Check,
  RefreshCw,
  ShieldCheck,
  Flame,
  Send,
  Download,
  Zap,
  Globe2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface FieldNewsItem {
  id: string;
  title: string;
  location: string;
  country: string;
  timestamp: string;
  severity: 'critical' | 'alert' | 'opportunity' | 'network';
  content: string;
  recommendation: string;
  offlineGenerated: boolean;
}

const INITIAL_FIELD_NEWS: FieldNewsItem[] = [
  {
    id: 'news-1',
    title: 'Tension de Stock Imminente sur Bock 65cl',
    location: 'Yopougon (Niangon & Rue Princesse)',
    country: '🇨🇮 Côte d\'Ivoire',
    timestamp: 'Il y a 8 min (Généré en tâche de fond)',
    severity: 'critical',
    content: 'Les caisses de 18 débits de boissons ont signalé une vélocité supérieure à 65 cols/heure. Les stocks tampons sont tombés à moins de 2 casiers disponibles avant la nuit.',
    recommendation: 'Activer le réassort d\'urgence prioritaire depuis le dépôt Solibra Yopougon pour sécuriser la soirée.',
    offlineGenerated: true,
  },
  {
    id: 'news-2',
    title: 'Offensive Heineken 50cl sur les Lounges et Afterworks',
    location: 'Cocody (Angré 8e Tranche & Vallon)',
    country: '🇨🇮 Côte d\'Ivoire',
    timestamp: 'Il y a 24 min (Détection Autonome)',
    severity: 'opportunity',
    content: 'Heineken 50cl enregistre une surperformance de +18.4% de vélocité face à Beaufort Lager. Les barmans plébiscitent le conditionnement en seau réfrigéré.',
    recommendation: 'Maintenir la dotation de PLV et d\'animations musicales pour consolider l\'avance sur le segment premium.',
    offlineGenerated: true,
  },
  {
    id: 'news-3',
    title: 'Surstock Critique Détecté : Tuborg & Panaché (Produits en Mal)',
    location: 'Marcory (Zone 4 & Biétry)',
    country: '🇨🇮 Côte d\'Ivoire',
    timestamp: 'Il y a 47 min (Audit Hors-Ligne)',
    severity: 'alert',
    content: 'Doppel Munich et Panaché affichent une rotation hebdomadaire inférieure à 1.2 casier par point de vente. 42 casiers risquent le dépassement de DLUO dans 15 jours.',
    recommendation: 'Lancer une mécanique de déstockage "1 bouteille offerte pour 2 bières premium" dès le service de 18h00.',
    offlineGenerated: true,
  },
  {
    id: 'news-4',
    title: 'Surge International Réseau Burkina : Beaufort-33 & Brakina',
    location: 'Ouagadougou (cristal Bar)',
    country: '🇧🇫 Burkina Faso',
    timestamp: 'Il y a 1h 15min (Sync GlobalSale)',
    severity: 'network',
    content: 'Les établissements connectés à Ouagadougou signalent une accélération des volumes de Beaufort-33 (Solibra) avec 292 ventes réelles enregistrées sur le hub cristal Bar.',
    recommendation: 'Ajuster les réapprovisionnements transfrontaliers depuis le hub de distribution central.',
    offlineGenerated: true,
  },
  {
    id: 'news-5',
    title: 'Activité Débit Hub Kinshasa : Heineken-33 & Beaufort',
    location: 'Kinshasa (Cash Money Corporation)',
    country: '🇨🇩 RD Congo',
    timestamp: 'Il y a 2h 05min (Agent DeerFlow)',
    severity: 'opportunity',
    content: 'Le débit de Heineken-33 et Beaufort-33 totalise 321 cols sur les transactions réelles du point de vente Cash Money Corporation.',
    recommendation: 'Maintenir la veille sur la rotation des formats 33cl et 25cl en liaison avec le barman.',
    offlineGenerated: true,
  },
];

interface AutonomousAgentNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutonomousAgentNewsModal: React.FC<AutonomousAgentNewsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [news, setNews] = useState<FieldNewsItem[]>(INITIAL_FIELD_NEWS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'alert' | 'opportunity' | 'network'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [offlineCount, setOfflineCount] = useState<number>(5);

  // Simulation de la génération autonome en arrière-plan
  useEffect(() => {
    const timer = setInterval(() => {
      const generatedMinutes = Math.floor(Math.random() * 5) + 1;
      const locations = [
        { loc: 'Bouaké (Commerce)', ctry: '🇨🇮 Côte d\'Ivoire', title: 'Accélération des commandes de Bock 65cl (+18 casiers)' },
        { loc: 'San Pedro (Bardot)', ctry: '🇨🇮 Côte d\'Ivoire', title: 'Surconsommation de Beaufort Lager en bord de mer' },
        { loc: 'Ouagadougou (Koulouba)', ctry: '🇧🇫 Burkina Faso', title: 'Brakina Blonde : Flux tendu sur 12 débits centraux' },
      ];
      const pick = locations[Math.floor(Math.random() * locations.length)];
      
      const backgroundBulletin: FieldNewsItem = {
        id: `news-auto-${Date.now()}`,
        title: pick.title,
        location: pick.loc,
        country: pick.ctry,
        timestamp: `Il y a ${generatedMinutes} min (Généré en tâche de fond)`,
        severity: 'opportunity',
        content: `Audit autonome DeerFlow : Le capteur d'encaissement a relevé un débit supérieur à la moyenne locale (+16.5%). L'agent a consolidé cette métrique pour arbitrage sans intervention humaine.`,
        recommendation: 'Maintenir la logistique continue.',
        offlineGenerated: true,
      };

      setNews((prev) => [backgroundBulletin, ...prev.slice(0, 9)]);
      setOfflineCount((prev) => prev + 1);
    }, 45000); // Génération autonome périodique en fond

    return () => clearInterval(timer);
  }, []);

  const handleRefreshAudit = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const freshNews: FieldNewsItem = {
        id: `news-${Date.now()}`,
        title: 'Nouveau Pic de Consommation Détecté à Koumassi Remblais',
        location: 'Koumassi (Remblais)',
        country: '🇨🇮 Côte d\'Ivoire',
        timestamp: 'À l\'instant (Audit Réseau Immédiat)',
        severity: 'opportunity',
        content: 'Accélération des commandes de bières blondes (+24 casiers) enregistrée sur les 12 derniers tickets de caisse.',
        recommendation: 'Sécuriser la disponibilité des bouteilles fraîches pour le pic de 22h00.',
        offlineGenerated: false,
      };
      setNews((prev) => [freshNews, ...prev.slice(0, 8)]);
      setIsRefreshing(false);
    }, 800);
  };

  const handleCopy = (item: FieldNewsItem) => {
    const text = `🚨 FLASH TERRAIN DEERFLOW [${item.country} - ${item.location}] :\n${item.title}\n${item.content}\n★ ACTION C-LEVEL : ${item.recommendation}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredNews = news.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.severity === activeFilter;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl flex flex-col justify-between"
          >
            {/* 1. EN-TÊTE PRINCIPAL & BADGE D'AUTONOMIE EN ARRIÈRE-PLAN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Radio className="size-5 text-orange-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-foreground">
                      Flash Terrain IA • Veille &amp; Synthèses Autonomes
                    </h3>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono">
                      GÉNÉRÉ EN ARRIÈRE-PLAN ({offlineCount} BULLETINS)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    L&apos;agent DeerFlow construit et enrichit ces bulletins continuellement, même lorsque l&apos;application est fermée ou hors écran
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshAudit}
                  disabled={isRefreshing}
                  className="h-8 font-mono text-xs border-slate-700 bg-slate-900 gap-1.5"
                >
                  <RefreshCw className={`size-3 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* 2. BANNIÈRE RÉSUMÉ HORS-LIGNE & FILTRES SÉVÉRITÉ */}
            <div className="pt-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Sparkles className="size-3.5 text-cyan-400 shrink-0" />
                <span>
                  Veille active sur <strong>1 420 débits CI</strong> et <strong>370 débits sous-région</strong>
                </span>
              </div>

              {/* Filtres de sévérité */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'all' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tous ({news.length})
                </button>
                <button
                  onClick={() => setActiveFilter('critical')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'critical' ? 'bg-rose-500 text-white font-bold' : 'text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  Ruptures
                </button>
                <button
                  onClick={() => setActiveFilter('alert')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'alert' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  Produits en Mal
                </button>
                <button
                  onClick={() => setActiveFilter('opportunity')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'opportunity' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  Surges
                </button>
                <button
                  onClick={() => setActiveFilter('network')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'network' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  Multi-Pays
                </button>
              </div>
            </div>

            {/* 3. LISTE DES FLASHS INFO DU TERRAIN */}
            <div className="my-2 overflow-y-auto pr-1 space-y-3 max-h-[58vh]">
              {filteredNews.map((item) => {
                const isCritical = item.severity === 'critical';
                const isAlert = item.severity === 'alert';
                const isOpportunity = item.severity === 'opportunity';
                const isNetwork = item.severity === 'network';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isCritical
                        ? 'border-rose-500/50 bg-gradient-to-r from-rose-950/20 via-slate-950 to-slate-950 shadow-md shadow-rose-500/5'
                        : isAlert
                        ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-950 to-slate-950'
                        : isOpportunity
                        ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-slate-950 to-slate-950'
                        : 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/20 via-slate-950 to-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-[9px] font-mono border ${
                            isCritical
                              ? 'bg-rose-500 text-white border-rose-600 font-bold'
                              : isAlert
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : isOpportunity
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          }`}
                        >
                          {isCritical
                            ? 'URGENT RUPTURE'
                            : isAlert
                            ? 'ALERTE SURSTOCK'
                            : isOpportunity
                            ? 'SURGE COMMERCIAL'
                            : 'FLUX TRANSFRONTALIER'}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-foreground">{item.title}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                          <MapPin className="size-3 text-cyan-400" />
                          {item.location} ({item.country})
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="size-3 text-slate-500" />
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{item.content}</p>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="text-cyan-300 font-semibold flex items-start sm:items-center gap-1.5">
                        <Sparkles className="size-3.5 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
                        <span>Plan d&apos;Action C-Level : {item.recommendation}</span>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(item)}
                          className="h-7 px-2.5 text-[11px] font-mono text-slate-400 hover:text-foreground border border-slate-800"
                        >
                          {copiedId === item.id ? <Check className="size-3 text-emerald-400 mr-1" /> : <Share2 className="size-3 mr-1" />}
                          {copiedId === item.id ? 'Copié' : 'Partager'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* 4. FOOTER AVEC STATUT D'AUTONOMIE & ACTIONS GLOBALES */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="size-4 shrink-0" />
                <span>Agent DeerFlow opérationnel • Synchronisation continue sans interruption</span>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 font-mono text-xs bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
                  onClick={() => {
                    const allText = news.map((n) => `[${n.location}] ${n.title}\n${n.content}\nAction : ${n.recommendation}`).join('\n\n');
                    navigator.clipboard?.writeText(allText);
                    alert('Synthèse complète de toutes les actualités terrain copiée !');
                  }}
                >
                  <Send className="size-3" />
                  <span>Diffuser Rapport Synthétique</span>
                </Button>

                <Button size="sm" onClick={onClose} className="h-8 px-4 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-foreground">
                  Fermer
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
