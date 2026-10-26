import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type StockFocus = 'forecast' | 'ruptures' | 'lost' | 'low' | 'overstock';
export type StockTimelineMetric = 'events' | 'units';

interface StockUiState {
  /** Liste mise en avant (ruptures, ventes manquées, sous le seuil, stock dormant) */
  focus: StockFocus;
  /** Chronologie : nombre d'événements ou unités réassorties */
  metric: StockTimelineMetric;
  /** Marque sélectionnée dans le classement (filtre local, aucune requête) */
  brand: string | null;
  /** Catégorie du face-à-face concurrents */
  category: string | null;
  set: (patch: Partial<Pick<StockUiState, 'focus' | 'metric' | 'brand' | 'category'>>) => void;
}

const FOCUS: StockFocus[] = ['forecast', 'ruptures', 'lost', 'low', 'overstock'];
const METRICS: StockTimelineMetric[] = ['events', 'units'];

/** Affichage de la page Stock Intelligence (mémorisé dans le navigateur, valeurs contrôlées) */
export const useStockUiStore = create<StockUiState>()(
  persist(
    (set) => ({
      focus: 'ruptures',
      metric: 'events',
      brand: null,
      category: null,
      set: (patch) =>
        set((s) => ({
          focus: patch.focus && FOCUS.includes(patch.focus) ? patch.focus : s.focus,
          metric: patch.metric && METRICS.includes(patch.metric) ? patch.metric : s.metric,
          brand: patch.brand !== undefined ? (patch.brand ? patch.brand.slice(0, 80) : null) : s.brand,
          category: patch.category !== undefined ? (patch.category ? patch.category.slice(0, 80) : null) : s.category,
        })),
    }),
    {
      name: 'emaquis-stock-ui',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ focus: s.focus, metric: s.metric }),
      // Valeurs relues depuis le navigateur : rejetées si inconnues
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StockUiState>;
        return {
          ...current,
          focus: p.focus && FOCUS.includes(p.focus) ? p.focus : current.focus,
          metric: p.metric && METRICS.includes(p.metric) ? p.metric : current.metric,
        };
      },
    },
  ),
);
