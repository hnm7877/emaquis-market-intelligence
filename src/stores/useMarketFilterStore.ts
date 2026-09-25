import { create } from 'zustand';
import { FilterState, DateRange, Country, City, Commune, Category, Brand, PosType } from '@/types/market';

interface MarketFilterStore {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  country: 'cote_d_ivoire',
  dateRange: 'all',
  city: 'Toutes les villes',
  commune: 'Toutes les communes',
  category: 'Toutes catégories',
  brand: 'Toutes marques',
  posType: 'Tous types',
};

export const useMarketFilterStore = create<MarketFilterStore>((set) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
  resetFilters: () => set({ filters: defaultFilters }),
}));