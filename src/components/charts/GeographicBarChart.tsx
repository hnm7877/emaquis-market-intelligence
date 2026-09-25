'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GEOGRAPHY_DATA } from '@/data/mockMarketData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface GeographicBarChartProps {
  data?: any[];
}

export function GeographicBarChart({ data }: GeographicBarChartProps) {
  const chartData = data?.length
    ? data.map((z) => ({
        commune: z.zone || z.commune,
        city: z.city,
        volume: Math.round(z.volume),
        posCount: z.posCount,
        demandIndex: z.demandIndex || 110,
        growthPercent: z.growth || z.growthPercent || 10,
      }))
    : GEOGRAPHY_DATA;

  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Volume de Ventes par Zone / Commune
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Concentration de la consommation dans les zones géolocalisées
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
              <XAxis dataKey="commune" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-xl p-3 shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-foreground">{d.commune} ({d.city})</p>
                        <p className="text-orange-500 font-medium">Volume : <strong>{d.volume.toLocaleString()}</strong> cols</p>
                        <p className="text-muted-foreground">Points de vente : {d.posCount} établissements</p>
                        <p className="text-foreground">Indice Demande : {d.demandIndex} / 100</p>
                        <p className="text-emerald-500 font-semibold">Croissance : +{d.growthPercent}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="volume" fill="#ea580c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}