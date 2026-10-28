'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Activity,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMarketSocket } from '@/api/socket';
import { useMarketRealtimeStore, LiveSaleTransaction } from '@/stores/useMarketRealtimeStore';
import { anonymizeEstablishmentName } from '@/utils/anonymize';

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
  isLive?: boolean;
}

interface AutonomousAgentNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsData?: any;
  geoData?: any;
  overviewData?: any;
  brandsData?: any;
  totalRealEstablishments?: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');
const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
const computedAt = () => `Calculé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
const SCOPE = 'Périmètre filtré';

/**
 * Bulletins construits uniquement à partir des chiffres réels reçus de l'API
 * (alertes, produits, zones). Aucune valeur de repli : une donnée absente n'est pas affichée,
 * et sans donnée il n'y a pas de bulletin.
 */
function generateRealBulletinsFromDatabase(
  productsData?: any,
  geoData?: any,
  overviewData?: any,
  _brandsData?: any,
): FieldNewsItem[] {
  const bulletins: FieldNewsItem[] = [];
  const products: any[] = productsData?.products || [];
  const zones: any[] = geoData?.zones || [];
  const alerts: any[] = overviewData?.alerts || [];
  const at = computedAt();

  // 1. Alertes calculées par le serveur
  alerts.forEach((alt, idx) => {
    if (typeof alt?.variation !== 'number') return;
    const isUp = alt.variation > 0;
    bulletins.push({
      id: `news-alert-${alt.id || idx}`,
      title: alt.title || `${isUp ? 'Hausse' : 'Baisse'} sur ${alt.category} (${signed(alt.variation)})`,
      location: alt.zone || SCOPE,
      country: SCOPE,
      timestamp: at,
      severity: isUp ? 'opportunity' : 'alert',
      content: `${alt.category} : ${signed(alt.variation)} sur ${alt.period || 'la période'}${alt.coveragePos ? `, mesuré sur ${fmt(alt.coveragePos)} établissements` : ''}${
        typeof alt.currentVolume === 'number' && typeof alt.previousVolume === 'number' ? ` (${fmt(alt.currentVolume)} contre ${fmt(alt.previousVolume)} unités)` : ''
      }. Fiabilité : ${alt.confidence || 'n/d'}.`,
      recommendation: isUp ? `Vérifier la couverture de stock sur ${alt.category} dans cette zone.` : `Analyser la cause du recul (prix, rupture, concurrence) avant d'agir.`,
      offlineGenerated: true,
    });
  });

  // 2. Ruptures réelles (stock synchronisé)
  products
    .filter((p) => p.stockoutRisk === 'HIGH' && p.stock && p.stock.trackedPos > 0)
    .slice(0, 3)
    .forEach((p, idx) => {
      const st = p.stock;
      bulletins.push({
        id: `news-critical-${p.id || idx}`,
        title: `Risque de rupture : ${p.name}`,
        location: p.topCommunes?.[0] || SCOPE,
        country: SCOPE,
        timestamp: at,
        severity: 'critical',
        content: `${fmt(st.outOfStockPos)} établissement(s) en rupture et ${fmt(st.lowCoverPos)} à faible couverture sur ${fmt(st.trackedPos)} suivis${
          st.medianDaysCover != null ? ` ; couverture médiane ${st.medianDaysCover} jour(s)` : ''
        }.`,
        recommendation: `Prévoir un réassort de ${p.name}${p.brand ? ` auprès du distributeur ${p.brand}` : ''}.`,
        offlineGenerated: true,
      });
    });

  // 3. Plus fortes progressions (variation réelle)
  const withGrowth = products.filter((p) => typeof p.growth === 'number' && p.volume > 0);
  [...withGrowth]
    .filter((p) => p.growth > 0)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 3)
    .forEach((p, idx) => {
      bulletins.push({
        id: `news-surge-${p.id || idx}`,
        title: `${p.name} progresse (${signed(p.growth)})`,
        location: p.topCommunes?.length ? p.topCommunes.slice(0, 2).join(', ') : SCOPE,
        country: SCOPE,
        timestamp: at,
        severity: 'opportunity',
        content: `${fmt(p.volume)} unités vendues${p.revenue ? ` (${fmt(p.revenue)} F)` : ''}${p.posCount ? ` dans ${fmt(p.posCount)} établissements` : ''}, soit ${signed(p.growth)} par rapport à la période précédente.`,
        recommendation: `Sécuriser la disponibilité de ${p.name} là où il progresse.`,
        offlineGenerated: true,
      });
    });

  // 4. Plus forts reculs (variation réelle)
  [...withGrowth]
    .filter((p) => p.growth < -2)
    .sort((a, b) => a.growth - b.growth)
    .slice(0, 2)
    .forEach((p, idx) => {
      bulletins.push({
        id: `news-distressed-${p.id || idx}`,
        title: `${p.name} recule (${signed(p.growth)})`,
        location: p.topCommunes?.[0] || SCOPE,
        country: SCOPE,
        timestamp: at,
        severity: 'alert',
        content: `${fmt(p.volume)} unités vendues${p.posCount ? ` dans ${fmt(p.posCount)} établissements` : ''}, soit ${signed(p.growth)} par rapport à la période précédente.`,
        recommendation: `Comparer son prix et sa disponibilité à ceux de ses concurrents (vue Concurrence).`,
        offlineGenerated: true,
      });
    });

  // 5. Zones les plus actives, tous pays
  [...zones]
    .filter((z) => Number(z.volume) > 0)
    .sort((a, b) => Number(b.volume) - Number(a.volume))
    .slice(0, 3)
    .forEach((z, idx) => {
      bulletins.push({
        id: `news-network-${z.id || idx}`,
        title: `Zone active : ${z.zone}${z.city ? ` (${z.city})` : ''}`,
        location: [z.zone, z.city].filter(Boolean).join(', '),
        country: z.country || SCOPE,
        timestamp: at,
        severity: 'network',
        content: `${fmt(Number(z.volume))} unités vendues${z.revenue ? ` pour ${fmt(Number(z.revenue))} F` : ''}${z.posCount ? ` dans ${fmt(Number(z.posCount))} établissements` : ''}.`,
        recommendation: `Adapter les tournées de livraison au rythme de cette zone.`,
        offlineGenerated: true,
      });
    });

  return bulletins;
}

export const AutonomousAgentNewsModal: React.FC<AutonomousAgentNewsModalProps> = ({
  isOpen,
  onClose,
  productsData,
  geoData,
  overviewData,
  brandsData,
  totalRealEstablishments = 0,
}) => {
  const { isConnected, recentTransactions, liveAlerts } = useMarketRealtimeStore();

  // Bulletins de base générés à partir des vraies collections MongoDB
  const initialBulletins = useMemo(() => {
    return generateRealBulletinsFromDatabase(productsData, geoData, overviewData, brandsData);
  }, [productsData, geoData, overviewData, brandsData]);

  const [news, setNews] = useState<FieldNewsItem[]>(initialBulletins);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'alert' | 'opportunity' | 'network'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [liveEventsCount, setLiveEventsCount] = useState<number>(0);
  const [lastLiveSyncTime, setLastLiveSyncTime] = useState<string>('À l\'instant');
  const processedTxIds = useRef<Set<string>>(new Set());

  // 1. Synchronisation avec les données réelles issues de React Query dès qu'une refetch se produit
  useEffect(() => {
    if (initialBulletins.length > 0) {
      setNews((prev) => {
        // Préserver les bulletins live récents reçus via WebSocket tout en rafraîchissant le fond
        const liveBulletins = prev.filter((item) => item.isLive);
        const nonLiveIds = new Set(initialBulletins.map((b) => b.id));
        const merged = [...liveBulletins.filter((b) => !nonLiveIds.has(b.id)), ...initialBulletins];
        return merged.slice(0, 25);
      });
      const now = new Date();
      setLastLiveSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    }
  }, [initialBulletins]);

  // 2. ÉCOUTE TEMPS RÉEL WEBSOCKET (SOCKET.IO) : Captation directe des ventes et alertes
  useEffect(() => {
    const socket = getMarketSocket();
    if (!socket) return;


    // B. Événement vente publique générique (market:new-sale)
    const handleNewSale = (event: any) => {
      if (!event) return;
      const comm = event.commune || event.city || 'commune non renseignée';
      const pCount = event.productsCount || 1;
      const amt = Number(event.amount) || 0;

      const liveBulletin: FieldNewsItem = {
        id: `news-live-sale-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: `Sortie de caisse en direct (${pCount} article${pCount > 1 ? 's' : ''})`,
        location: [comm, event.city].filter(Boolean).join(', '),
        country: event.country || 'Réseau E-Maquis',
        timestamp: `À ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
        severity: 'opportunity',
        content: `Transaction de ${amt > 0 ? `${amt.toLocaleString('fr-FR')} FCFA` : 'consommation validée'} enregistrée par le serveur sur le point de vente de ${comm}.`,
        recommendation: `Vente prise en compte dans les tableaux de bord.`,
        offlineGenerated: false,
        isLive: true,
      };

      setNews((prev) => [liveBulletin, ...prev.slice(0, 24)]);
      setLiveEventsCount((c) => c + 1);
    };


    socket.on('market:new-sale', handleNewSale);

    return () => {
      socket.off('market:new-sale', handleNewSale);
    };
  }, []);

  // 3. SURVEILLANCE DES NOUVELLES TRANSACTIONS DU STORE ZUSTAND
  useEffect(() => {
    if (!recentTransactions || recentTransactions.length === 0) return;

    const latestTx = recentTransactions[0];
    if (latestTx && latestTx.id && !processedTxIds.current.has(latestTx.id)) {
      processedTxIds.current.add(latestTx.id);

      const liveBulletin: FieldNewsItem = {
        id: `news-store-tx-${latestTx.id}`,
        title: `Vente POS validée : ${latestTx.productsCount || 1} article(s)`,
        location: [latestTx.commune, latestTx.city].filter(Boolean).join(', ') || 'commune non renseignée',
        country: 'Réseau E-Maquis',
        timestamp: `À ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
        severity: 'opportunity',
        content: `Encaissement de ${Number(latestTx.amount || 0).toLocaleString('fr-FR')} FCFA enregistré${latestTx.commune ? ` à ${latestTx.commune}` : ''}.`,
        recommendation: `Vente prise en compte dans les tableaux de bord.`,
        offlineGenerated: false,
        isLive: true,
      };

      setNews((prev) => [liveBulletin, ...prev.slice(0, 24)]);
      setLiveEventsCount((c) => c + 1);
    }
  }, [recentTransactions]);

  // 4. Actualisation manuelle : recalcul immédiat depuis la base
  const handleRefreshAudit = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const refreshed = generateRealBulletinsFromDatabase(productsData, geoData, overviewData, brandsData);
      setNews(refreshed);
      setIsRefreshing(false);
      const now = new Date();
      setLastLiveSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    }, 500);
  };

  const handleCopy = (item: FieldNewsItem) => {
    const text = `🚨 FLASH TERRAIN RÉEL E-MAQUIS [${item.country} - ${item.location}] :\n${item.title}\n${item.content}\n★ ACTION C-LEVEL : ${item.recommendation}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      if (activeFilter === 'all') return true;
      return item.severity === activeFilter;
    });
  }, [news, activeFilter]);

  // Décompte de couverture réseau
  const networkCoverageStats = useMemo(() => {
    const zones: any[] = geoData?.zones || [];
    let ciCount = 0;
    let subRegionCount = 0;

    zones.forEach((z) => {
      const c = (z.country || '').toLowerCase();
      const pos = Number(z.posCount) || 0;
      if (c.includes('burkina') || c.includes('congo') || c.includes('rdc') || c.includes('sénégal') || c.includes('bénin')) {
        subRegionCount += pos;
      } else {
        ciCount += pos;
      }
    });

    return {
      ci: ciCount > 0 ? ciCount : totalRealEstablishments,
      subRegion: subRegionCount,
    };
  }, [geoData, totalRealEstablishments]);

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
            {/* 1. EN-TÊTE PRINCIPAL AVEC STATUT BD TEMPS RÉEL */}
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
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                      FLUX TEMPS RÉEL ACTIF ({news.length} BULLETINS)
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Wifi className="size-3" />
                      {isConnected ? 'WebSocket Connecté' : 'Synchronisation Live'}
                    </span>
                    <span>•</span>
                    <span>Dernière synchro : {lastLiveSyncTime}</span>
                    {liveEventsCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-300 font-bold">{liveEventsCount} événement(s) direct</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshAudit}
                  disabled={isRefreshing}
                  className="h-8 font-mono text-xs border-slate-700 bg-slate-900 gap-1.5"
                  title="Re-synchroniser immédiatement les synthèses avec la base de données"
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
                  Veille active sur <strong>{networkCoverageStats.ci.toLocaleString('fr-FR')} débits CI</strong> et{' '}
                  <strong>{networkCoverageStats.subRegion.toLocaleString('fr-FR')} débits sous-région</strong>
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
                  Ruptures ({news.filter((n) => n.severity === 'critical').length})
                </button>
                <button
                  onClick={() => setActiveFilter('alert')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'alert' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  Produits en Mal ({news.filter((n) => n.severity === 'alert').length})
                </button>
                <button
                  onClick={() => setActiveFilter('opportunity')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'opportunity' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  Surges ({news.filter((n) => n.severity === 'opportunity').length})
                </button>
                <button
                  onClick={() => setActiveFilter('network')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                    activeFilter === 'network' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                >
                  Multi-Pays ({news.filter((n) => n.severity === 'network').length})
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
                      item.isLive
                        ? 'border-emerald-500/70 bg-gradient-to-r from-emerald-950/30 via-slate-950 to-slate-950 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/30'
                        : isCritical
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
                        {item.isLive && (
                          <Badge className="bg-emerald-500 text-slate-950 font-mono text-[9px] font-black animate-pulse flex items-center gap-1">
                            <span className="size-1 rounded-full bg-slate-950 animate-ping" />
                            DIRECT POS
                          </Badge>
                        )}
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
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                          <Clock className="size-3 text-slate-400" />
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
                <span>Propulsé par HNM</span>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 font-mono text-xs bg-orange-600 hover:bg-orange-500 text-white gap-1.5"
                  onClick={() => {
                    const allText = news
                      .map((n) => `[${n.location}] ${n.title}\n${n.content}\nAction : ${n.recommendation}`)
                      .join('\n\n');
                    navigator.clipboard?.writeText(allText);
                    alert('Synthèse complète de toutes les actualités terrain réelles copiée !');
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
