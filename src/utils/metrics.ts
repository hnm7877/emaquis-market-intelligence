/**
 * Formatage des indicateurs renvoyés par l'API Market Intelligence.
 *
 * L'API renvoie `null` lorsqu'un indicateur ne peut pas être calculé
 * (période précédente vide, échantillon insuffisant…). On affiche alors « n/d »
 * plutôt qu'une valeur par défaut inventée.
 */

export const NOT_AVAILABLE = 'n/d';

export const isAvailable = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** « +12.5% », « -3% » ou « n/d » */
export function formatGrowth(value: number | null | undefined): string {
  if (!isAvailable(value)) return NOT_AVAILABLE;
  return `${value > 0 ? '+' : ''}${value}%`;
}

/** Sens de variation pour les badges / couleurs */
export function growthTrend(value: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (!isAvailable(value) || value === 0) return 'neutral';
  return value > 0 ? 'up' : 'down';
}

/** Classe de couleur Tailwind selon le sens de variation */
export function growthColorClass(value: number | null | undefined): string {
  const trend = growthTrend(value);
  if (trend === 'up') return 'text-emerald-400';
  if (trend === 'down') return 'text-rose-400';
  return 'text-muted-foreground';
}

/** Valeur numérique ou « n/d » */
export function formatMetric(value: number | null | undefined, suffix = ''): string {
  if (!isAvailable(value)) return NOT_AVAILABLE;
  return `${value.toLocaleString('fr-FR')}${suffix}`;
}

/** Classes d'un badge de variation (fond + texte + bordure) */
export function growthBadgeClass(value: number | null | undefined): string {
  const trend = growthTrend(value);
  if (trend === 'up') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (trend === 'down') return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  return 'bg-muted/40 text-muted-foreground border-border/60';
}

/** Part en pourcentage (1 décimale), 0 si total nul */
export function computeShareLocal(value: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}
