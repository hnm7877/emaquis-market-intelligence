import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PromoTab = 'all' | 'active' | 'best' | 'worst';
export type PromoGroupBy = 'brand' | 'zone';

interface PromotionsUiState {
  tab: PromoTab;
  groupBy: PromoGroupBy;
  /** Marque ou commune sélectionnée (filtre local de la liste, aucune requête) */
  focus: string | null;
  set: (patch: Partial<Pick<PromotionsUiState, 'tab' | 'groupBy' | 'focus'>>) => void;
}

const TABS: PromoTab[] = ['all', 'active', 'best', 'worst'];
const GROUPS: PromoGroupBy[] = ['brand', 'zone'];

/** Affichage de la page Promotions (mémorisé dans le navigateur, valeurs contrôlées) */
export const usePromotionsUiStore = create<PromotionsUiState>()(
  persist(
    (set) => ({
      tab: 'all',
      groupBy: 'brand',
      focus: null,
      set: (patch) =>
        set((s) => ({
          tab: patch.tab && TABS.includes(patch.tab) ? patch.tab : s.tab,
          groupBy: patch.groupBy && GROUPS.includes(patch.groupBy) ? patch.groupBy : s.groupBy,
          // Changer de regroupement annule la sélection
          focus: patch.groupBy && patch.groupBy !== s.groupBy ? null : patch.focus !== undefined ? (patch.focus ? patch.focus.slice(0, 80) : null) : s.focus,
        })),
    }),
    {
      name: 'emaquis-promotions-ui',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tab: s.tab, groupBy: s.groupBy }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PromotionsUiState>;
        return {
          ...current,
          tab: p.tab && TABS.includes(p.tab) ? p.tab : current.tab,
          groupBy: p.groupBy && GROUPS.includes(p.groupBy) ? p.groupBy : current.groupBy,
        };
      },
    },
  ),
);
