import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DisplayVolumeUnit } from '@/utils/productVolumeConverter';

export type BourseTab = 'ladder' | 'recharts' | 'duel' | 'countries' | 'geography';
export type MapMetric = 'volume' | 'revenue' | 'pos';
export type MapView = 'map' | 'ranking' | 'seasonality' | 'mesh3d';

interface BourseUiState {
  tab: BourseTab;
  unit: DisplayVolumeUnit;
  territory: string;
  mapView: MapView;
  mapMetric: MapMetric;
  showPins: boolean;
  setTab: (tab: BourseTab) => void;
  setUnit: (unit: DisplayVolumeUnit) => void;
  setTerritory: (territory: string) => void;
  setMapView: (view: MapView) => void;
  setMapMetric: (metric: MapMetric) => void;
  togglePins: () => void;
}

const TABS: BourseTab[] = ['ladder', 'recharts', 'duel', 'countries', 'geography'];
const UNITS: DisplayVolumeUnit[] = ['cols', 'cl', 'litres', 'casiers'];
const VIEWS: MapView[] = ['map', 'ranking', 'seasonality', 'mesh3d'];
const METRICS: MapMetric[] = ['volume', 'revenue', 'pos'];

/** Préférences d'affichage de la page Bourse (mémorisées dans ce navigateur uniquement) */
export const useBourseUiStore = create<BourseUiState>()(
  persist(
    (set) => ({
      tab: 'ladder',
      unit: 'cols',
      territory: 'Abidjan',
      mapView: 'map',
      mapMetric: 'volume',
      showPins: true,
      setTab: (tab) => set({ tab }),
      setUnit: (unit) => set({ unit }),
      setTerritory: (territory) => set({ territory: String(territory).slice(0, 120) }),
      setMapView: (mapView) => set({ mapView }),
      setMapMetric: (mapMetric) => set({ mapMetric }),
      togglePins: () => set((s) => ({ showPins: !s.showPins })),
    }),
    {
      name: 'emaquis-bourse-ui',
      version: 1,
      skipHydration: true, // relu après le premier rendu (pas d'écart serveur / navigateur)
      storage: createJSONStorage(() => localStorage),
      partialize: ({ tab, unit, mapView, mapMetric, showPins }) => ({ tab, unit, mapView, mapMetric, showPins }),
      // Valeurs relues du navigateur : on ne garde que les valeurs connues
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<BourseUiState>;
        return {
          ...current,
          tab: TABS.includes(p.tab as BourseTab) ? (p.tab as BourseTab) : current.tab,
          unit: UNITS.includes(p.unit as DisplayVolumeUnit) ? (p.unit as DisplayVolumeUnit) : current.unit,
          mapView: VIEWS.includes(p.mapView as MapView) ? (p.mapView as MapView) : current.mapView,
          mapMetric: METRICS.includes(p.mapMetric as MapMetric) ? (p.mapMetric as MapMetric) : current.mapMetric,
          showPins: typeof p.showPins === 'boolean' ? p.showPins : current.showPins,
        };
      },
    },
  ),
);
