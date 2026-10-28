'use client';

import React from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';

export interface TreemapItem {
  id: string;
  name: string;
  size: number;
  growth: number | null;
  [key: string]: string | number | null;
}

/** Couleur selon la variation : vert si hausse, rouge si baisse, intensité selon l'ampleur */
function fill(g: number | null) {
  if (g == null) return '#3f3f46';
  const a = Math.min(1, 0.35 + Math.abs(g) / 40);
  return g >= 0 ? `rgba(74, 222, 128, ${a.toFixed(2)})` : `rgba(248, 113, 113, ${a.toFixed(2)})`;
}

type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  growth?: number | null;
  id?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Case de la carte (recharts lui passe position et données du produit) */
function Cell({ x = 0, y = 0, width = 0, height = 0, name, growth, id, selectedId, onSelect }: CellProps) {
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => id && onSelect(id)}>
      <rect x={x + 1.5} y={y + 1.5} width={Math.max(0, width - 3)} height={Math.max(0, height - 3)} rx={6} fill={fill(growth ?? null)} stroke={id === selectedId ? '#fbbf24' : 'none'} strokeWidth={2} />
      {width > 54 && height > 28 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(14, Math.max(10, width / 9))} fontWeight={700} fill="#0b0b0c">
          {String(name).length * 7 > width ? `${String(name).slice(0, Math.max(3, Math.floor(width / 8)))}…` : name}
        </text>
      )}
    </g>
  );
}

export function ProductTreemap({ items, selectedId, onSelect }: { items: TreemapItem[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (!items.length) return <p className="py-10 text-center text-xs text-muted-foreground">Aucun produit vendu dans cette catégorie.</p>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={items} dataKey="size" nameKey="name" isAnimationActive={false} content={<Cell selectedId={selectedId} onSelect={onSelect} />}>
          <Tooltip
            content={({ payload }) => {
              const p = payload?.[0]?.payload as TreemapItem | undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-xl">
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-muted-foreground">{p.size.toLocaleString('fr-FR')} unités</p>
                  <p className={p.growth == null ? 'text-muted-foreground' : p.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {p.growth == null ? 'Variation n/d' : `${p.growth > 0 ? '+' : ''}${p.growth} % vs période précédente`}
                  </p>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
