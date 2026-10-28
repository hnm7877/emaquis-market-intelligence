import React from 'react';

/** Mini-courbe en indice (base 100 = moyenne du produit) : ligne pointillée = moyenne */
export function Sparkline({ values, up, width = 84, height = 28 }: { values: number[]; up: boolean | null; width?: number; height?: number }) {
  if (values.length < 2) return <span className="inline-block" style={{ width, height }} />;
  const max = Math.max(100, ...values);
  const min = Math.min(100, ...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const color = up == null ? '#a1a1aa' : up ? '#4ade80' : '#f87171';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <line x1="0" x2={width} y1={y(100)} y2={y(100)} stroke={color} strokeOpacity="0.45" strokeDasharray="2 3" strokeWidth="1" />
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={color} fillOpacity="0.08" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
