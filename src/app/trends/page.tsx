'use client';

import React from 'react';
import { HourlyConsumptionChart } from '@/components/charts/HourlyConsumptionChart';
import { FilterBar } from '@/components/layout/FilterBar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Calendar, Flame } from 'lucide-react';
import { useTrendsQuery } from '@/hooks/market/useMarketQueries';
import { formatGrowth, isAvailable } from '@/utils/metrics';

export default function TrendsPage() {
  const { data: trends, isLoading, isError } = useTrendsQuery();

  const peakHours: string[] = trends?.peakHours ?? [];
  const weekendRatio: number | null = trends?.weekendOverWeekdayRatio ?? null;
  const monthEnd = trends?.monthEndEffect;
  const byDay: { day: string; avgDailyVolume: number; daysObserved: number }[] = trends?.byDayOfWeek ?? [];
  const busiestDay = [...byDay].sort((a, b) => b.avgDailyVolume - a.avgDailyVolume)[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="size-5 text-orange-500" />
              Tendances de Consommation &amp; Saisonnalité
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLoading
                ? 'Calcul des dynamiques horaires...'
                : isError
                  ? 'API indisponible'
                  : `${(trends?.daysObserved ?? 0).toLocaleString('fr-FR')} jours observés`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comportement d&apos;achat horaire et hebdomadaire observé dans le réseau E-Maquis.
          </p>
        </div>
      </div>

      <FilterBar />

      <HourlyConsumptionChart data={trends?.hourlyProfile} isLoading={isLoading} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Clock className="size-4 text-orange-500" />
            <span>Créneaux de pointe observés</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {peakHours.length > 0 ? (
              <>
                <strong className="text-foreground">{peakHours.join(', ')}</strong> concentrent{' '}
                <strong className="text-foreground">{trends?.peakHoursShare ?? 0}%</strong> des unités vendues sur
                la période filtrée.
              </>
            ) : (
              'Données insuffisantes pour identifier des créneaux de pointe.'
            )}
          </p>
        </Card>

        <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Calendar className="size-4 text-blue-500" />
            <span>Effet fin de mois (du 27 au 05)</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {monthEnd && isAvailable(monthEnd.upliftPercent) ? (
              <>
                Moyenne journalière de{' '}
                <strong className="text-foreground">
                  {monthEnd.monthEndAvgDailyVolume.toLocaleString('fr-FR')} u.
                </strong>{' '}
                en fin de mois contre {monthEnd.otherDaysAvgDailyVolume.toLocaleString('fr-FR')} u. le reste du mois,
                soit <strong className="text-foreground">{formatGrowth(monthEnd.upliftPercent)}</strong> (
                {monthEnd.monthEndDays} et {monthEnd.otherDays} jours observés).
              </>
            ) : (
              'Données insuffisantes pour mesurer un effet fin de mois.'
            )}
          </p>
        </Card>

        <Card className="border border-border/80 bg-card/70 backdrop-blur-md p-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Flame className="size-4 text-emerald-500" />
            <span>Intensité du week-end</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {isAvailable(weekendRatio) ? (
              <>
                Un jour du vendredi au dimanche génère en moyenne{' '}
                <strong className="text-foreground">{weekendRatio}x</strong> le volume d&apos;un jour du lundi au
                jeudi.
                {busiestDay && busiestDay.avgDailyVolume > 0 && (
                  <>
                    {' '}
                    Jour le plus fort : <strong className="text-foreground">{busiestDay.day}</strong> (
                    {busiestDay.avgDailyVolume.toLocaleString('fr-FR')} u. / jour en moyenne).
                  </>
                )}
              </>
            ) : (
              'Données insuffisantes pour comparer semaine et week-end.'
            )}
          </p>
        </Card>
      </div>

      {trends?.methodology && (
        <p className="text-[11px] text-muted-foreground">{trends.methodology}</p>
      )}
    </div>
  );
}
