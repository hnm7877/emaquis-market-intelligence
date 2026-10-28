'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface RadarAxis {
  label: string;
  /** 0 à 100 (null : donnée indisponible) */
  value: number | null;
  hint: string;
}

/** Radar à 4 axes (losange), anneaux arrondis, polygone animé */
export function ProductRadar({ axes, size = 300 }: { axes: RadarAxis[]; size?: number }) {
  const c = size / 2;
  const r = size * 0.27;
  const angle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const pt = (i: number, v: number) => [c + Math.cos(angle(i)) * r * (v / 100), c + Math.sin(angle(i)) * r * (v / 100)] as const;
  const poly = axes.map((a, i) => pt(i, Math.max(6, a.value ?? 0)).join(',')).join(' ');
  return (
    <svg viewBox={`-10 -6 ${size + 20} ${size + 12}`} className="mx-auto w-full max-w-[320px] overflow-visible" role="img" aria-label={axes.map((a) => `${a.label} ${a.value ?? 'n/d'} sur 100`).join(', ')}>
      {[25, 50, 75, 100].map((v) => (
        <polygon
          key={v}
          points={axes.map((_, i) => pt(i, v).join(',')).join(' ')}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={v === 100 ? 0.18 : 0.08}
          strokeLinejoin="round"
          strokeWidth={v === 100 ? 1.4 : 1}
        />
      ))}
      {axes.map((_, i) => (
        <line key={i} x1={c} y1={c} x2={pt(i, 118)[0]} y2={pt(i, 118)[1]} stroke="#ffffff" strokeOpacity="0.15" />
      ))}
      <motion.polygon
        points={poly}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
        style={{ transformOrigin: `${c}px ${c}px` }}
        fill="#f59e0b"
        fillOpacity="0.22"
        stroke="#fbbf24"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {axes.map((a, i) => {
        const [x, y] = pt(i, 128);
        return (
          <g key={a.label}>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#d4d4d8">{a.label}</text>
            <text x={x} y={y + 14} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#fbbf24">
              {a.value == null ? 'n/d' : a.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
