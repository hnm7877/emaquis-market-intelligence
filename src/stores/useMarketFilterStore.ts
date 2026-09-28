'use client';

import { create } from 'zustand';
import { FilterState, MultiFilterValue, VolumeUnit } from '@/types/market';

interface MarketFilterStore {
  filters: FilterState;
  autoSyncContextual: boolean;
  volumeUnit: VolumeUnit;
  setVolumeUnit: (unit: VolumeUnit) => void;
  setAutoSyncContextual: (enabled: boolean) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setMultipleFilters: (updates: Partial<FilterState>) => void;
  toggleFilterItem: (key: keyof FilterState, item: string, allLabel: string) => void;
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
  status: 'valid',
  autoSyncContextual: true,
  volumeUnit: 'cols',
};

export const useMarketFilterStore = create<MarketFilterStore>((set) => ({
  filters: defaultFilters,
  autoSyncContextual: true,
  volumeUnit: 'cols',

  setVolumeUnit: (unit: VolumeUnit) =>
    set((state) => ({
      volumeUnit: unit,
      filters: { ...state.filters, volumeUnit: unit },
    })),

  setAutoSyncContextual: (enabled: boolean) =>
    set({ autoSyncContextual: enabled }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  setMultipleFilters: (updates) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...updates,
      },
    })),

  toggleFilterItem: (key, item, allLabel) =>
    set((state) => {
      const current = state.filters[key];

      // Si l'utilisateur clique sur "Tout sélectionner"
      if (item === allLabel || item === 'all') {
        return {
          filters: {
            ...state.filters,
            [key]: allLabel,
          },
        };
      }

      // Convertir la valeur actuelle en tableau
      let currentArr: string[] = [];
      if (Array.isArray(current)) {
        currentArr = [...current];
      } else if (typeof current === 'string' && current !== allLabel && current !== 'all') {
        currentArr = current.split(',').map((s) => s.trim()).filter(Boolean);
      }

      const index = currentArr.indexOf(item);
      if (index > -1) {
        currentArr.splice(index, 1);
      } else {
        currentArr.push(item);
      }

      const nextValue: MultiFilterValue =
        currentArr.length === 0 ? allLabel : currentArr;

      return {
        filters: {
          ...state.filters,
          [key]: nextValue,
        },
      };
    }),

  resetFilters: () => set({ filters: defaultFilters }),
}));
