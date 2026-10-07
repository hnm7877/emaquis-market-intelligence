'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatGrowth, growthColorClass } from '@/utils/metrics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMarketOverview } from '@/hooks/market/useMarketQueries';

interface CategoryDistributionChartProps {
  data?: any[];
}

export function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
  const { data: apiData } = useMarketOverview();

  const sourceData = data || apiData?.topCategories || [];
  const chartData = sourceData.map((c: any, idx: number) => ({
    id: c.id || `cat-${idx}`,
    name: c.category || c.name,
    sharePercent: c.marketShare ?? c.sharePercent ?? 0,
    volume: c.volume ?? 0,
    growthPercent: c.growth ?? c.growthPercent ?? null,
    color: c.color || '#f59e0b',
  }));

  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Répartition des Ventes par Catégorie
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Parts de marché observées en volume de consommation
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-72 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Aucune vente par catégorie sur ce périmètre.
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData as any}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-xl p-3 shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-foreground">{d.name}</p>
                        <p className="text-foreground">Part : <strong>{d.sharePercent}%</strong></p>
                        <p className="text-muted-foreground">Volume : {d.volume.toLocaleString()} cols</p>
                        <p className={`font-semibold ${growthColorClass(d.growthPercent)}`}>
                          Croissance : {formatGrowth(d.growthPercent)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="sharePercent" radius={[0, 6, 6, 0]}>
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}