'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SALES_TIMELINE_DATA } from '@/data/mockMarketData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMarketOverview } from '@/hooks/market/useMarketQueries';

interface SalesEvolutionChartProps {
  data?: any[];
}

export function SalesEvolutionChart({ data }: SalesEvolutionChartProps) {
  const { data: apiData } = useMarketOverview();

  const sourceData = data || apiData?.salesEvolution;
  const chartData = sourceData && sourceData.length > 0
    ? sourceData.map((d: any) => ({
        label: d.date ? (d.date.length > 5 ? d.date.slice(5) : d.date) : (d.label || 'Jour'),
        volume: d.salesVolume ?? d.volume ?? 0,
        previousVolume: d.previousVolume ?? Math.round((d.salesVolume ?? d.volume ?? 0) * 0.88),
        revenue: d.revenue ?? 0,
      }))
    : SALES_TIMELINE_DATA;

  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight">
            Évolution des Volumes Vendus (Cols)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Volumes observés en temps réel consolidés sur le réseau
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-orange-500" />
            <span className="text-muted-foreground font-medium">Période en cours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-zinc-400" />
            <span className="text-muted-foreground font-medium">Période précédente</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
              <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-xl p-3 shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-foreground">{label}</p>
                        <p className="text-orange-500 font-medium">
                          Actuel : <strong>{payload[0].value?.toLocaleString()}</strong> cols
                        </p>
                        {payload[1] && (
                          <p className="text-muted-foreground">
                            Précédent : {payload[1].value?.toLocaleString()} cols
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#f97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorVolume)"
              />
              <Area
                type="monotone"
                dataKey="previousVolume"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorPrev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}