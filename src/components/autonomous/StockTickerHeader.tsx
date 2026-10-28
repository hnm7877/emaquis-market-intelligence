'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, ShieldCheck, Flame, Radio, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getBrandLogo } from '@/utils/brandLogos';
import { formatProductTicker } from '@/utils/productImages';

export interface TickerItem {
  symbol: string;
  name: string;
  brand: string;
  price: string;
  volume: string;
  delta: number | null;
  surge?: boolean;
  image?: string | null;
  brandLogo?: string | null;
}


import { DisplayVolumeUnit, formatProductVolume } from '@/utils/productVolumeConverter';

export const StockTickerHeader: React.FC<{
  items?: TickerItem[];
  apiProducts?: any[];
  unit?: DisplayVolumeUnit;
}> = ({ items, apiProducts, unit = 'cols' }) => {
  // Construire les items du ticker à partir des vrais produits de la base si fournis
  const tickerItems = useMemo<TickerItem[]>(() => {
    if (items && items.length > 0) return items;

    if (apiProducts && apiProducts.length > 0) {
      return apiProducts.slice(0, 10).map((p: any, idx: number) => {
        const realName = (p.name || '').trim();
        const realBrand = (p.brand || 'Non spécifié').trim();
        const vol = Number(p.volume) || 0;
        const price = Number(p.pricing?.avgSalePrice) || (p.revenue && vol > 0 ? Math.round(p.revenue / vol) : 0);
        // Variation réelle uniquement (null : pas d'historique sur la période précédente)
        const delta: number | null = typeof p.growth === 'number' ? p.growth : null;
        const formattedVol = formatProductVolume(vol, unit, realName, p.format);

        return {
          symbol: formatProductTicker(realName),
          name: realName,
          brand: realBrand,
          price: price > 0 ? `${price.toLocaleString('fr-FR')} F` : '—',
          volume: formattedVol.formatted,
          delta: delta == null ? null : parseFloat(delta.toFixed(1)),
          surge: delta != null && delta > 7,
          image: typeof p.image === 'string' && /^(https?:)?\/\//.test(p.image) ? p.image : null,
          brandLogo: getBrandLogo(realBrand),
        };
      });
    }

    return [];
  }, [items, apiProducts, unit]);

  // Variation moyenne pondérée par les volumes (produits avec historique uniquement)
  const avgGrowth = useMemo(() => {
    const rows = (apiProducts ?? []).filter((p): p is { growth: number; volume: number } => typeof p?.growth === 'number' && Number(p.volume) > 0);
    const w = rows.reduce((n, p) => n + Number(p.volume), 0);
    return w > 0 ? Math.round((rows.reduce((n, p) => n + p.growth * Number(p.volume), 0) / w) * 10) / 10 : null;
  }, [apiProducts]);

  if (!tickerItems.length) return null;

  return (
    <div className="w-full bg-slate-950/95 border-y border-slate-800/80 backdrop-blur-md overflow-hidden py-2 px-3 shadow-inner">
      <div className="flex items-center gap-4">
        {/* Badge Bourse indicateur */}
        <div className="flex items-center gap-2 pl-1 pr-3 border-r border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold">
            <Radio className="size-3 animate-pulse text-emerald-400" />
            BOURSE EN DIRECT
          </div>
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            PRODUITS BD
          </span>
        </div>

        {/* Ruban défilant avec Images Réelles et Noms Réels */}
        <div className="flex-1 overflow-hidden relative">
          <motion.div
            className="flex items-center gap-6 whitespace-nowrap will-change-transform"
            animate={{ x: [0, -1600] }}
            transition={{
              repeat: Infinity,
              duration: 38,
              ease: 'linear',
            }}
          >
            {[...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => {
              const isPositive = (item.delta ?? 0) >= 0;
              return (
                <div
                  key={`${item.symbol}-${idx}`}
                  className="flex items-center gap-2.5 text-xs font-mono px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/50 transition-colors shadow-sm"
                >
                  {/* Miniature Image du produit */}
                  <div className="size-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <Package className="size-3.5 text-amber-400" />
                    )}
                  </div>

                  <span className="font-bold text-foreground">{item.symbol}</span>
                  <span className="text-slate-300 font-semibold text-[11px] max-w-[130px] truncate">
                    {item.name}
                  </span>
                  <span className="text-orange-400 font-bold">{item.price}</span>

                  <span
                    className={`flex items-center gap-0.5 font-bold ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.delta == null ? null : isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {item.delta == null ? 'n/d' : isPositive ? `+${item.delta}%` : `${item.delta}%`}
                  </span>

                  <span className="text-[10px] text-slate-500">[{item.volume}]</span>

                  {item.surge && (
                    <Badge className="h-4 px-1 text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/40">
                      <Flame className="size-2.5 mr-0.5" /> SURGE
                    </Badge>
                  )}
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Télémétrie en direct */}
        <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-800 shrink-0 text-[11px] font-mono">
          <div className="text-muted-foreground">
            VARIATION MOYENNE :{' '}
            <span className={`font-bold ${avgGrowth == null ? 'text-slate-400' : avgGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {avgGrowth == null ? 'n/d' : `${avgGrowth > 0 ? '+' : ''}${avgGrowth}%`}
            </span>
          </div>
          <div className="text-muted-foreground">
            PRODUITS : <span className="text-cyan-400 font-bold">{(apiProducts?.length ?? 0).toLocaleString('fr-FR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
