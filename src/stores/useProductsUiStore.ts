import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DisplayVolumeUnit } from '@/utils/productVolumeConverter';

export type ProductSegment = 'all' | 'risk' | 'rising' | 'falling' | 'margin' | 'spread' | 'unsold';
export type ProductSort = 'volume' | 'revenue' | 'avgPrice' | 'margin' | 'rotation' | 'cover' | 'risk' | 'growth' | 'name';
export type ProductView = 'table' | 'grid';

interface ProductsUiState {
  search: string;
  category: string;
  brand: string;
  segment: ProductSegment;
  sort: ProductSort;
  dir: 1 | -1;
  view: ProductView;
  unit: DisplayVolumeUnit;
  pageSize: number;
  set: (patch: Partial<Omit<ProductsUiState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = { search: '', category: 'all', brand: 'all', segment: 'all' as ProductSegment, sort: 'volume' as ProductSort, dir: -1 as const, view: 'table' as ProductView, unit: 'cols' as DisplayVolumeUnit, pageSize: 25 };
const SEGMENTS: ProductSegment[] = ['all', 'risk', 'rising', 'falling', 'margin', 'spread', 'unsold'];
const SORTS: ProductSort[] = ['volume', 'revenue', 'avgPrice', 'margin', 'rotation', 'cover', 'risk', 'growth', 'name'];
const UNITS: DisplayVolumeUnit[] = ['cols', 'cl', 'litres', 'casiers'];

/** Filtres et affichage de la page Produits (appliqués sur les données déjà reçues : aucune requête) */
export const useProductsUiStore = create<ProductsUiState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set((s) => ({ ...s, ...patch, search: patch.search != null ? patch.search.slice(0, 80) : s.search })),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'emaquis-products-ui',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ sort, dir, view, unit, pageSize }) => ({ sort, dir, view, unit, pageSize }),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<ProductsUiState>;
        return {
          ...current,
          sort: SORTS.includes(p.sort as ProductSort) ? (p.sort as ProductSort) : current.sort,
          dir: p.dir === 1 ? 1 : -1,
          view: p.view === 'grid' ? 'grid' : 'table',
          unit: UNITS.includes(p.unit as DisplayVolumeUnit) ? (p.unit as DisplayVolumeUnit) : current.unit,
          pageSize: [25, 50, 100].includes(Number(p.pageSize)) ? Number(p.pageSize) : current.pageSize,
          segment: SEGMENTS.includes(current.segment) ? current.segment : 'all',
        };
      },
    },
  ),
);
