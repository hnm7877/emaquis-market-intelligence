'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Candles } from '@/lib/validations/market.schemas';

const UP = '#4ade80';
const DOWN = '#f87171';
const fmtPrice = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

/**
 * Libellé d'une bougie : 1 jour = jour local déjà calculé par le serveur (affiché tel quel) ;
 * 5 min / 1 h = instant affiché à l'heure de l'appareil de la personne qui consulte.
 */
function label(iso: string, interval: Candles['interval']) {
  const d = new Date(iso);
  return interval === '1d'
    ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Bougies en SVG (léger, aucun calcul inutile) : prix de vente unitaire réel par intervalle,
 * unités vendues en barres, ligne du dernier prix et réticule au survol / toucher.
 */
export function CandleChart({ data, height = 380 }: { data: Candles; height?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const candles = useMemo(() => data.candles.slice(-Math.max(20, Math.floor(width / 9))), [data.candles, width]);
  const geo = useMemo(() => {
    const padR = 64;
    const priceH = height * 0.74;
    const volTop = priceH + 16;
    const volH = height - volTop - 18;
    const hi = Math.max(...candles.map((c) => c.h));
    const lo = Math.min(...candles.map((c) => c.l));
    const pad = (hi - lo || hi * 0.02 || 1) * 0.08;
    const max = hi + pad;
    const min = Math.max(0, lo - pad);
    const vmax = Math.max(1, ...candles.map((c) => c.v));
    const step = (width - padR) / Math.max(candles.length, 1);
    return {
      padR,
      priceH,
      volTop,
      volH,
      step,
      body: Math.max(2, Math.min(14, step * 0.62)),
      y: (p: number) => 8 + (1 - (p - min) / (max - min || 1)) * (priceH - 16),
      vy: (v: number) => volTop + volH - (v / vmax) * volH,
      x: (i: number) => i * step + step / 2,
      ticks: Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4),
    };
  }, [candles, width, height]);

  if (!candles.length) {
    return <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>Aucune vente avec un prix sur cette période.</div>;
  }

  const last = candles[candles.length - 1];
  const h = hover != null ? candles[hover] : null;
  const onMove = (clientX: number) => {
    const r = host.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.floor((clientX - r.left) / geo.step);
    setHover(i >= 0 && i < candles.length ? i : null);
  };

  return (
    <div ref={host} className="relative w-full select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Bougies de prix : dernier prix ${fmtPrice(last.c)} F`}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={width - geo.padR} y1={geo.y(t)} y2={geo.y(t)} stroke="#ffffff" strokeOpacity="0.05" />
            <text x={width - geo.padR + 6} y={geo.y(t) + 3} fontSize="10" fill="#8a8a8a">{fmtPrice(t)}</text>
          </g>
        ))}
        {candles.map((c, i) => {
          const up = c.c >= c.o;
          const col = up ? UP : DOWN;
          const top = geo.y(Math.max(c.o, c.c));
          const bh = Math.max(1.5, Math.abs(geo.y(c.o) - geo.y(c.c)));
          return (
            <g key={c.t} opacity={hover == null || hover === i ? 1 : 0.55}>
              <line x1={geo.x(i)} x2={geo.x(i)} y1={geo.y(c.h)} y2={geo.y(c.l)} stroke={col} strokeWidth="1.2" />
              <rect x={geo.x(i) - geo.body / 2} y={top} width={geo.body} height={bh} fill={col} rx="1" />
              <rect x={geo.x(i) - geo.body / 2} y={geo.vy(c.v)} width={geo.body} height={geo.volTop + geo.volH - geo.vy(c.v)} fill={col} opacity="0.35" />
            </g>
          );
        })}
        <line x1={0} x2={width - geo.padR} y1={geo.y(last.c)} y2={geo.y(last.c)} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity="0.8" />
        <rect x={width - geo.padR + 2} y={geo.y(last.c) - 9} width={geo.padR - 4} height={18} rx="4" fill="#f59e0b" />
        <text x={width - geo.padR + 6} y={geo.y(last.c) + 4} fontSize="10.5" fontWeight="700" fill="#111">{fmtPrice(last.c)}</text>
        {h && hover != null && (
          <line x1={geo.x(hover)} x2={geo.x(hover)} y1={0} y2={height - 18} stroke="#ffffff" strokeOpacity="0.25" strokeDasharray="2 3" />
        )}
        {[0, Math.floor(candles.length / 2), candles.length - 1].map((i) => (
          <text key={i} x={Math.min(Math.max(geo.x(i), 20), width - geo.padR - 20)} y={height - 4} fontSize="10" fill="#8a8a8a" textAnchor="middle">
            {label(candles[i].t, data.interval)}
          </text>
        ))}
      </svg>
      {h && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] tabular-nums shadow-xl backdrop-blur">
          <p className="mb-1 font-semibold text-foreground">{label(h.t, data.interval)}</p>
          <p className="text-muted-foreground">
            Ouv. <span className="text-foreground">{fmtPrice(h.o)}</span> · Haut <span className="text-foreground">{fmtPrice(h.h)}</span> · Bas{' '}
            <span className="text-foreground">{fmtPrice(h.l)}</span> · Clôt. <span className={h.c >= h.o ? 'text-emerald-400' : 'text-red-400'}>{fmtPrice(h.c)}</span>
          </p>
          <p className="text-muted-foreground">
            {h.v.toLocaleString('fr-FR')} unités · {h.n.toLocaleString('fr-FR')} lignes de vente
          </p>
        </div>
      )}
    </div>
  );
}
