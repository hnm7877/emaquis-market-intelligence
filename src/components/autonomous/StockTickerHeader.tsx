'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, ShieldCheck, Flame, Radio, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getBrandLogo } from '@/utils/brandLogos';
import { resolveProductImage, formatProductTicker } from '@/utils/productImages';

export interface TickerItem {
  symbol: string;
  name: string;
  brand: string;
  price: string;
  volume: string;
  delta: number;
  surge?: boolean;
  image?: string | null;
  brandLogo?: string | null;
}

const DEFAULT_TICKERS: TickerItem[] = [
  { symbol: 'BCK-65', name: 'Bock 65cl (66)', brand: 'Solibra', price: '500 F', volume: '14,820 c/j', delta: 4.2, image: resolveProductImage(null, 'Bock 65cl', 'Solibra'), brandLogo: getBrandLogo('Solibra') },
  { symbol: 'HNX-50', name: 'Heineken 50cl', brand: 'Brassivoire', price: '1,000 F', volume: '14,210 c/j', delta: 8.7, surge: true, image: resolveProductImage(null, 'Heineken 50cl', 'Brassivoire'), brandLogo: getBrandLogo('Brassivoire') },
  { symbol: 'BFT-50', name: 'Beaufort Lager 50cl', brand: 'Solibra', price: '700 F', volume: '11,950 c/j', delta: 2.1, image: resolveProductImage(null, 'Beaufort Lager', 'Solibra'), brandLogo: getBrandLogo('Solibra') },
  { symbol: 'IVR-65', name: 'Ivoire Spéciale 65cl', brand: 'Brassivoire', price: '600 F', volume: '11,400 c/j', delta: 3.5, image: resolveProductImage(null, 'Ivoire Spéciale', 'Brassivoire'), brandLogo: getBrandLogo('Brassivoire') },
  { symbol: 'GNS-33', name: 'Guinness Foreign Extra', brand: 'Diageo', price: '800 F', volume: '9,800 c/j', delta: -1.4, image: resolveProductImage(null, 'Guinness', 'Diageo'), brandLogo: getBrandLogo('Diageo') },
  { symbol: 'CST-50', name: 'Castel Beer 50cl', brand: 'Solibra', price: '600 F', volume: '8,650 c/j', delta: 0.9, image: resolveProductImage(null, 'Castel Beer', 'Solibra'), brandLogo: getBrandLogo('Solibra') },
  { symbol: 'DSP-33', name: 'Desperados Tequila', brand: 'Brassivoire', price: '1,200 F', volume: '7,890 c/j', delta: 12.4, surge: true, image: resolveProductImage(null, 'Desperados', 'Brassivoire'), brandLogo: getBrandLogo('Brassivoire') },
  { symbol: 'CLO-50', name: 'Chill Citron 50cl', brand: 'Solibra', price: '600 F', volume: '6,720 c/j', delta: 5.6, image: resolveProductImage(null, 'Chill Citron', 'Solibra'), brandLogo: getBrandLogo('Solibra') },
  { symbol: 'DOB-50', name: 'Doppel Munich 50cl', brand: 'Solibra', price: '700 F', volume: '5,940 c/j', delta: -2.3, image: resolveProductImage(null, 'Doppel Munich', 'Solibra'), brandLogo: getBrandLogo('Solibra') },
  { symbol: 'RBL-25', name: 'Red Bull Energy 25cl', brand: 'Import', price: '1,500 F', volume: '4,830 c/j', delta: 7.1, image: resolveProductImage(null, 'Red Bull', 'Import'), brandLogo: null },
];

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
        const price = Number(p.price) || (p.revenue && vol > 0 ? Math.round(p.revenue / vol) : 600);
        const delta = Number(p.growth) || (idx % 2 === 0 ? +(3.2 + idx * 0.7) : -(1.1 + idx * 0.4));
        const formattedVol = formatProductVolume(vol, unit, realName, p.format);

        return {
          symbol: formatProductTicker(realName),
          name: realName,
          brand: realBrand,
          price: `${price.toLocaleString('fr-FR')} F`,
          volume: formattedVol.formatted,
          delta: parseFloat(delta.toFixed(1)),
          surge: delta > 7,
          image: resolveProductImage(p.image, realName, realBrand),
          brandLogo: getBrandLogo(realBrand),
        };
      });
    }

    return DEFAULT_TICKERS;
  }, [items, apiProducts, unit]);

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
              const isPositive = item.delta >= 0;
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
                    {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {isPositive ? `+${item.delta}%` : `${item.delta}%`}
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
            INDEX VÉLOCITÉ : <span className="text-emerald-400 font-bold">+6.4%</span>
          </div>
          <div className="text-muted-foreground">
            LATENCE RÉSEAU : <span className="text-cyan-400 font-bold">14ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
