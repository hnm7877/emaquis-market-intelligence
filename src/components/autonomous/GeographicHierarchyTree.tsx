'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ChevronRight,
  TrendingUp,
  Flame,
  Award,
  ArrowRight,
  Globe2,
  Building,
  Navigation,
  Layers,
  BarChart3,
  Store,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { anonymizeEstablishmentName } from '@/utils/anonymize';

export interface GeoNode {
  id: string;
  name: string;
  level: 'country' | 'city' | 'commune' | 'establishment';
  volume: number; // Volume réel
  share: number; // % réel du parent
  pointsOfSale: number; // Nombre réel d'établissements
  revenue?: number; // CA réel en FCFA
  transactions?: number;
  hasGps?: boolean;
  latitude?: number;
  longitude?: number;
  velocityTrend?: number | null; // Croissance réelle (%)
  intensity: 'ultra' | 'high' | 'medium' | 'emerging';
  subNodes?: GeoNode[];
}

const INTENSITY_CONFIG = {
  ultra: { label: 'Ultra-Consommation 🔥', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40', barColor: '#f43f5e' },
  high: { label: 'Forte Consommation ⚡', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40', barColor: '#f97316' },
  medium: { label: 'Consommation Stable 🟢', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', barColor: '#10b981' },
  emerging: { label: 'Zone Modérée 💧', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', barColor: '#06b6d4' },
};

function getIntensity(share: number): 'ultra' | 'high' | 'medium' | 'emerging' {
  if (share >= 25) return 'ultra';
  if (share >= 12) return 'high';
  if (share >= 5) return 'medium';
  return 'emerging';
}

/**
 * Construit dynamiquement la pyramide hiérarchique réelle à partir des zones
 * et des établissements stockés dans la base de données (zéro hallucination).
 */
export function buildRealHierarchyTree(geoData: any): GeoNode {
  const zones: any[] = geoData?.zones || [];
  const establishments: any[] = geoData?.establishments || [];

  // Si pas encore de données en base, retourner un nœud racine vide
  if (!zones || zones.length === 0) {
    return {
      id: 'root-ci',
      name: 'Côte d\'Ivoire (Réseau National)',
      level: 'country',
      volume: 0,
      share: 100,
      pointsOfSale: 0,
      intensity: 'emerging',
      subNodes: [],
    };
  }

  // 1. Calculer le volume national réel (somme des zones en base)
  const totalCountryVolume = zones.reduce((sum, z) => sum + (Number(z.volume) || 0), 0) || 1;
  const totalPosCount = zones.reduce((sum, z) => sum + (Number(z.posCount) || 0), 0);

  // 2. Regrouper les zones réelles par ville (ex: Abidjan, Bouaké, San Pedro, Yamoussoukro...)
  const cityMap = new Map<string, { zones: any[]; volume: number; posCount: number }>();

  zones.forEach((z) => {
    const rawCity = (z.city || z.zone || 'Abidjan').trim();
    const cityKey = rawCity.charAt(0).toUpperCase() + rawCity.slice(1);

    if (!cityMap.has(cityKey)) {
      cityMap.set(cityKey, { zones: [], volume: 0, posCount: 0 });
    }
    const entry = cityMap.get(cityKey)!;
    const vol = Number(z.volume) || 0;
    const pos = Number(z.posCount) || 1;
    entry.zones.push(z);
    entry.volume += vol;
    entry.posCount += pos;
  });

  // 3. Indexer les vrais établissements par commune / zone
  const estByZone = new Map<string, any[]>();
  establishments.forEach((est) => {
    const rawZone = (est.zone || est.city || '').trim().toLowerCase();
    if (!estByZone.has(rawZone)) {
      estByZone.set(rawZone, []);
    }
    estByZone.get(rawZone)!.push(est);
  });

  // 4. Construire les nœuds de villes
  const cityNodes: GeoNode[] = Array.from(cityMap.entries()).map(([cityName, cityData]) => {
    const cityShare = Math.round(((cityData.volume / totalCountryVolume) * 100) * 10) / 10;

    // Trier les zones/communes de cette ville par volume réel décroissant
    const communeNodes: GeoNode[] = cityData.zones
      .map((z: any) => {
        const zoneVol = Number(z.volume) || 0;
        const zoneShare = cityData.volume > 0
          ? Math.round(((zoneVol / cityData.volume) * 100) * 10) / 10
          : 0;
        const rawZoneKey = (z.zone || '').trim().toLowerCase();

        // Récupérer les vrais établissements rattachés à cette zone
        const zoneEstablishments = (estByZone.get(rawZoneKey) || []).slice();
        // Trier les établissements réels par volume décroissant
        zoneEstablishments.sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));

        const establishmentNodes: GeoNode[] = zoneEstablishments.map((est: any) => {
          const estVol = Number(est.volume) || 0;
          const estShare = zoneVol > 0 ? Math.round(((estVol / zoneVol) * 100) * 10) / 10 : 0;

          return {
            id: est.id || `est-${Math.random()}`,
            name: anonymizeEstablishmentName(est.name, est.id),
            level: 'establishment' as const,
            volume: estVol,
            share: estShare,
            pointsOfSale: 1,
            revenue: est.revenue || 0,
            transactions: est.transactions || 0,
            hasGps: Boolean(est.hasDirectGps),
            latitude: est.latitude,
            longitude: est.longitude,
            intensity: getIntensity(estShare),
          };
        });

        return {
          id: z.id || `zone-${z.zone}`,
          name: z.zone || 'Commune',
          level: 'commune' as const,
          volume: zoneVol,
          share: zoneShare,
          pointsOfSale: Number(z.posCount) || zoneEstablishments.length || 1,
          velocityTrend: typeof z.growth === 'number' ? z.growth : null,
          intensity: getIntensity(zoneShare),
          subNodes: establishmentNodes,
        };
      })
      .sort((a, b) => b.volume - a.volume);

    return {
      id: `city-${cityName.toLowerCase()}`,
      name: cityName,
      level: 'city' as const,
      volume: cityData.volume,
      share: cityShare,
      pointsOfSale: cityData.posCount,
      intensity: getIntensity(cityShare),
      subNodes: communeNodes,
    };
  });

  // Trier les villes par volume réel décroissant
  cityNodes.sort((a, b) => b.volume - a.volume);

  return {
    id: 'root-ci',
    name: 'Côte d\'Ivoire (Réseau National Réel)',
    level: 'country',
    volume: totalCountryVolume,
    share: 100,
    pointsOfSale: totalPosCount || establishments.length,
    intensity: 'ultra',
    subNodes: cityNodes,
  };
}

export const GeographicHierarchyTree: React.FC<{
  geoData?: any;
  onSelectTerritory?: (name: string, level: string) => void;
}> = ({ geoData, onSelectTerritory }) => {
  // Arborescence construite strictement à partir des vraies zones et établissements de la base
  const hierarchyRoot = useMemo(() => buildRealHierarchyTree(geoData), [geoData]);

  // Pile de navigation (Breadcrumb)
  const [navStack, setNavStack] = useState<GeoNode[]>([hierarchyRoot]);

  // Si les données de la BD se mettent à jour, réinitialiser la racine proprement
  React.useEffect(() => {
    setNavStack([hierarchyRoot]);
  }, [hierarchyRoot]);

  const currentNode = navStack[navStack.length - 1] || hierarchyRoot;
  const items = useMemo(() => {
    return (currentNode.subNodes || []).slice().sort((a, b) => b.volume - a.volume);
  }, [currentNode]);

  const handleDrillDown = (node: GeoNode) => {
    if (node.subNodes && node.subNodes.length > 0) {
      setNavStack((prev) => [...prev, node]);
    }
    onSelectTerritory?.(node.name, node.level);
  };

  const handleBreadcrumbClick = (index: number) => {
    setNavStack((prev) => prev.slice(0, index + 1));
  };

  // Données du graphique Recharts basées sur les vraies entités de la base
  const chartData = useMemo(() => {
    return items.slice(0, 10).map((item, idx) => ({
      name: item.name.length > 18 ? `${item.name.substring(0, 16)}...` : item.name,
      fullName: item.name,
      volume: item.volume,
      share: item.share,
      pointsOfSale: item.pointsOfSale,
      intensity: item.intensity,
      level: item.level,
      revenue: item.revenue,
      rank: idx + 1,
    }));
  }, [items]);

  const isShowingEstablishments = items.length > 0 && items[0]?.level === 'establishment';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/85 backdrop-blur-xl p-5 shadow-2xl space-y-5">
      {/* En-tête avec Fil d'Ariane dynamique */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe2 className="size-5 text-cyan-400" />
              Pyramide Territoriale Réelle • Du Plus Fort au Plus Faible (BD)
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
              Vraies Données BD
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classement exhaustif des volumes et établissements réels enregistrés par les caisses de la base de données
          </p>
        </div>

        {/* Fil d'Ariane de navigation */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
          {navStack.map((node, idx) => {
            const isLast = idx === navStack.length - 1;
            return (
              <React.Fragment key={node.id}>
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-cyan-400 transition-colors ${
                    isLast ? 'text-cyan-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  {node.name.split(' (')[0]}
                </button>
                {!isLast && <ChevronRight className="size-3 text-slate-600" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Grille Principale : Graphique Recharts Réel (Gauche) + Liste Triée Réelle (Droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Graphique Recharts sur les volumes réels */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="size-4 text-cyan-400" />
              Volumes réels ({currentNode.name.split(' (')[0]})
            </span>
            <Badge variant="outline" className="text-[10px] font-mono text-cyan-300 border-cyan-500/30">
              {currentNode.volume.toLocaleString('fr-FR')} casiers
            </Badge>
          </div>

          <div className="h-[270px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    width={95}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs font-mono shadow-xl space-y-1">
                            <div className="font-bold text-foreground">#{data.rank} {data.fullName}</div>
                            <div className="text-cyan-400 font-semibold">
                              {data.volume.toLocaleString('fr-FR')} casiers ({data.share}%)
                            </div>
                            {data.level === 'establishment' ? (
                              <div className="text-slate-400 text-[10px]">
                                {data.revenue > 0 ? `CA: ${data.revenue.toLocaleString('fr-FR')} FCFA` : 'Ventes enregistrées'}
                              </div>
                            ) : (
                              <div className="text-slate-400 text-[10px]">
                                {data.pointsOfSale} établissement(s) réels en BD
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={INTENSITY_CONFIG[entry.intensity as keyof typeof INTENSITY_CONFIG]?.barColor || '#0ea5e9'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                Aucune donnée géographique enregistrée
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-3 border-t border-slate-800/80">
            <span>Établissements réels rattachés :</span>
            <span className="font-bold text-foreground">{currentNode.pointsOfSale} débits</span>
          </div>
        </div>

        {/* Liste Triée des Vraies Entités de la Base (Villes / Communes / Établissements) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-2 pb-1">
            <span className="flex items-center gap-1.5">
              {isShowingEstablishments ? (
                <>
                  <Store className="size-3.5 text-orange-400" />
                  ÉTABLISSEMENTS RÉELS DE LA BD ({items.length})
                </>
              ) : (
                <>
                  <Compass className="size-3.5 text-cyan-400" />
                  ZONES RÉELLES CLASSÉES PAR VOLUME (DU + FORT AU + FAIBLE)
                </>
              )}
            </span>
            <span>{isShowingEstablishments ? 'DÉTAILS VENTES' : 'CLIQUER POUR DESCENDRE DANS LA BD'}</span>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {items.length > 0 ? (
              items.map((node, index) => {
                const intensityCfg = INTENSITY_CONFIG[node.intensity];
                const hasChildren = Boolean(node.subNodes && node.subNodes.length > 0);
                const isEstablishment = node.level === 'establishment';

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => hasChildren && handleDrillDown(node)}
                    className={`group p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 transition-all flex items-center justify-between gap-3 ${
                      hasChildren
                        ? 'cursor-pointer hover:border-cyan-500/50 hover:scale-[1.01]'
                        : 'border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`size-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          index === 0
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                            : index === 1
                            ? 'bg-slate-300 text-slate-950'
                            : index === 2
                            ? 'bg-orange-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{index + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-foreground group-hover:text-cyan-400 transition-colors flex items-center gap-2 truncate">
                          {isEstablishment ? (
                            <Store className="size-3.5 text-orange-400 shrink-0" />
                          ) : (
                            <MapPin className="size-3.5 text-cyan-400 shrink-0" />
                          )}
                          <span className="truncate">{node.name}</span>

                          {hasChildren && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-cyan-500/30 text-cyan-400 font-mono shrink-0">
                              {node.subNodes?.length} {node.level === 'commune' ? 'établissements' : 'communes'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                          {isEstablishment ? (
                            <>
                              <span>{node.revenue ? `${node.revenue.toLocaleString('fr-FR')} F` : 'Actif'}</span>
                              <span>•</span>
                              <span>{node.transactions || 1} tickets</span>
                              {node.hasGps && (
                                <Badge className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 h-4 px-1">
                                  GPS Réel
                                </Badge>
                              )}
                            </>
                          ) : (
                            <>
                              <span>{node.pointsOfSale} établissement(s) réels</span>
                              {typeof node.velocityTrend === 'number' && (
                                <>
                                  <span>•</span>
                                  <span className={node.velocityTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                    {node.velocityTrend >= 0 ? `+${node.velocityTrend}%` : `${node.velocityTrend}%`}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right shrink-0">
                      <div>
                        <div className="font-mono text-xs font-bold text-foreground">
                          {node.volume.toLocaleString('fr-FR')} c
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400">
                          {node.share}%
                        </div>
                      </div>

                      <Badge className={`text-[10px] font-mono border hidden sm:inline-flex ${intensityCfg.badge}`}>
                        {node.intensity === 'ultra' ? 'Ultra 🔥' : node.intensity === 'high' ? 'Fort ⚡' : 'Stable'}
                      </Badge>

                      {hasChildren ? (
                        <ChevronRight className="size-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                      ) : (
                        <span className="size-4" />
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="p-4 rounded-xl border border-slate-800 text-center text-xs font-mono text-slate-500">
                Aucun sous-niveau géographique répertorié pour cette zone dans la base de données.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
