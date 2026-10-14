'use client';

import type { LocationPrecision } from '@/lib/validations/market.schemas';

const LEVELS: { key: keyof LocationPrecision; label: string; hint: string; color: string }[] = [
  { key: 'sale_gps', label: 'GPS de vente', hint: 'Position enregistrée sur la vente', color: '#10b981' },
  { key: 'barman', label: 'Barman sur place', hint: "Position envoyée depuis l'établissement", color: '#22c55e' },
  { key: 'owner', label: 'Épingle patron', hint: 'Position placée sur la carte par le patron', color: '#f59e0b' },
  { key: 'declared', label: 'Ville / commune', hint: 'Adresse déclarée (centre de la commune)', color: '#64748b' },
];

/**
 * Indice de précision géographique : part des points de vente localisés par chaque source.
 * Plus la part « GPS / barman » est élevée, plus les indicateurs par zone sont fiables.
 */
export function LocationPrecisionBar({
  precision,
  unlocated = 0,
}: {
  precision?: LocationPrecision;
  unlocated?: number;
}) {
  if (!precision) return null;
  const located = LEVELS.reduce((sum, l) => sum + (precision[l.key] || 0), 0);
  const total = located + unlocated;
  if (total === 0) return null;
  const precise = (precision.sale_gps || 0) + (precision.barman || 0);
  const score = Math.round((precise / total) * 100);
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="mt-2 max-w-xl">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span>
          Précision de localisation :{' '}
          <span className="font-semibold text-foreground">{score}%</span> des points de vente localisés sur place
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60">
        {LEVELS.map((l) =>
          precision[l.key] ? (
            <div key={l.key} title={`${l.label} : ${precision[l.key]}`} style={{ width: pct(precision[l.key]), background: l.color }} />
          ) : null,
        )}
        {unlocated > 0 && <div title={`Non localisés : ${unlocated}`} style={{ width: pct(unlocated), background: '#334155' }} />}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        {LEVELS.map((l) => (
          <span key={l.key} className="inline-flex items-center gap-1" title={l.hint}>
            <span className="size-2 rounded-full" style={{ background: l.color }} />
            {l.label} {pct(precision[l.key] || 0)}
          </span>
        ))}
        {unlocated > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: '#334155' }} />
            Non localisés {pct(unlocated)}
          </span>
        )}
      </div>
    </div>
  );
}
