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
  Legend,
} from 'recharts';
import { HOURLY_CONSUMPTION_DATA } from '@/data/mockMarketData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function HourlyConsumptionChart() {
  return (
    <Card className="border border-border/80 bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Pics Horaires de Consommation (Semaine vs Week-end)
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Moments d'affluence et pics de consommation hors domicile
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={HOURLY_CONSUMPTION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
              <XAxis dataKey="hour" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-xl p-3 shadow-xl text-xs space-y-1">
                        <p className="font-semibold text-foreground">Plage horaire : {label}</p>
                        <p className="text-blue-500 font-medium">Semaine : {payload[0].value?.toLocaleString()} cols</p>
                        <p className="text-orange-500 font-medium">Week-end : {payload[1].value?.toLocaleString()} cols</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="weekdayVolume" name="Lundi - Jeudi" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="weekendVolume" name="Vendredi - Dimanche" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
