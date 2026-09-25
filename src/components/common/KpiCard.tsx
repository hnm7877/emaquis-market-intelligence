'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { KpiMetric } from '@/types/market';

interface KpiCardProps {
  metric: KpiMetric;
}

export function KpiCard({ metric }: KpiCardProps) {
  const isUp = metric.trend === 'up';
  const isDown = metric.trend === 'down';

  return (
    <Card className="relative overflow-hidden border border-border/70 bg-gradient-to-b from-card to-card/60 hover:border-primary/40 transition-all duration-300 hover:shadow-md group">
      {/* Decorative top accent glow line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground tracking-wide">
            {metric.title}
          </span>
          {metric.badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-border/60">
              {metric.badge}
            </span>
          )}
        </div>

        <div className="my-1 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-foreground">
            {metric.value}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
          <div className="flex items-center gap-1">
            {isUp && (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                <TrendingUp className="size-3.5 mr-0.5 inline" />
                +{metric.changePercent}%
              </span>
            )}
            {isDown && (
              <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold text-xs">
                <TrendingDown className="size-3.5 mr-0.5 inline" />
                -{metric.changePercent}%
              </span>
            )}
            {!isUp && !isDown && (
              <span className="flex items-center text-muted-foreground font-medium text-xs">
                <Minus className="size-3.5 mr-0.5 inline" />
                {metric.changePercent}%
              </span>
            )}
            <span className="text-[11px] text-muted-foreground ml-1 truncate max-w-[120px]">
              {metric.comparisonPeriod}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
