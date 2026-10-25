'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Building2, Crown, DollarSign, Package, Radio, Rocket, TrendingDown, TrendingUp } from 'lucide-react';
import { resolveProductImage } from '@/utils/productImages';

function Delta({ value }: { value?: number | null }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-slate-500">pas de comparaison</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold whitespace-nowrap ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? '+' : ''}
      {value.toFixed(1)} %
    </span>
  );
}

interface Product {
  name: string;
  brand?: string;
  image?: string | null;
  growth?: number | null;
}

interface BourseKpiStripProps {
  loading: boolean;
  volume: { value: number; format: (n: number) => string; unitLabel: string };
  revenue: number;
  establishments: number;
  growth: { volume?: number | null; revenue?: number | null; pos?: number | null };
  live: { connected: boolean; sales: number; amount: number };
  leader?: Product;
  challenger?: Product;
}

const money = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : Math.round(n).toLocaleString('fr-FR'));
const int = (n: number) => Math.round(n).toLocaleString('fr-FR');

const card = 'relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/70 p-3';

export function BourseKpiStrip({ loading, volume, revenue, establishments, growth, live, leader, challenger }: BourseKpiStripProps) {
  const items = [
    { label: 'Volume vendu', icon: Package, color: 'text-amber-400', value: volume.value, format: volume.format, sub: volume.unitLabel, delta: growth.volume },
    { label: "Chiffre d'affaires", icon: DollarSign, color: 'text-emerald-400', value: revenue, format: money, sub: 'FCFA', delta: growth.revenue },
    { label: 'Maquis actifs', icon: Building2, color: 'text-cyan-400', value: establishments, format: int, sub: 'points de vente', delta: growth.pos },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          className={card}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{it.label}</span>
            <it.icon className={`size-3.5 ${it.color}`} />
          </div>
          <div className="mt-1 text-lg font-mono font-bold text-white">
            {loading ? <span className="inline-block h-5 w-20 animate-pulse rounded bg-slate-800" /> : <AnimatedNumber value={it.value} format={it.format} />}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>{it.sub}</span>
            <Delta value={it.delta} />
          </div>
        </motion.div>
      ))}

      {/* Ventes reçues en direct depuis l'ouverture de la page */}
      <motion.div
        className={`${card} ${live.connected ? 'border-amber-500/30' : ''}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>En direct</span>
          <Radio className={`size-3.5 ${live.connected ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
        </div>
        <div className="mt-1 text-lg font-mono font-bold text-white">
          <AnimatedNumber value={live.sales} format={int} />
          <span className="ml-1 text-xs font-normal text-slate-400">ventes</span>
        </div>
        <div className="text-[10px] text-slate-500 truncate">
          {live.connected ? `${money(live.amount)} F depuis l'ouverture` : 'reconnexion en cours…'}
        </div>
      </motion.div>

      <ProductCard tone="amber" icon={Crown} title="N° 1 du marché" product={leader} delay={0.16} />
      <ProductCard tone="emerald" icon={Rocket} title="Challenger" product={challenger} delay={0.2} />
    </div>
  );
}

function ProductCard({ tone, icon: Icon, title, product, delay }: { tone: 'amber' | 'emerald'; icon: typeof Crown; title: string; product?: Product; delay: number }) {
  const img = product ? resolveProductImage(product.image ?? null, product.name, product.brand) : null;
  const border = tone === 'amber' ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5';
  const text = tone === 'amber' ? 'text-amber-400' : 'text-emerald-400';
  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border p-3 flex items-center gap-3 ${border}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${text}`}>
          <Icon className="size-3" />
          {title}
        </div>
        {product ? (
          <>
            <div className="mt-0.5 truncate text-xs font-semibold text-white">{product.name}</div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="truncate">{product.brand}</span>
              {product.growth != null && <Delta value={product.growth} />}
            </div>
          </>
        ) : (
          <div className="mt-1 h-4 w-24 animate-pulse rounded bg-slate-800" />
        )}
      </div>
      <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center">
        {img ? <img src={img} alt="" className="size-full object-cover" /> : <Package className={`size-4 ${text}`} />}
      </div>
    </motion.div>
  );
}
