import { create } from 'zustand';
import { MarketAlert } from '@/types/market';

export interface LiveSaleTransaction {
  id: string;
  city: string;
  commune: string;
  amount: number;
  productsCount: number;
  timestamp: string;
}

/** Résumé reçu toutes les 3 s (zones agrégées, jamais d'établissement) */
export interface MarketPulse {
  at: string;
  windowMs: number;
  sales: number;
  amount: number;
  items: number;
  zones: { city: string; commune: string; sales: number; amount: number; items: number }[];
}

/** Cumul depuis l'ouverture du tableau de bord */
export interface LiveTotals {
  since: string | null;
  sales: number;
  amount: number;
  items: number;
}

interface MarketRealtimeStore {
  lastPulse: MarketPulse | null;
  liveTotals: LiveTotals;
  addPulse: (pulse: MarketPulse) => void;
  isConnected: boolean;
  liveAlerts: MarketAlert[];
  recentTransactions: LiveSaleTransaction[];
  setConnected: (status: boolean) => void;
  addLiveAlert: (alert: MarketAlert) => void;
  addLiveTransaction: (tx: LiveSaleTransaction) => void;
}

export const useMarketRealtimeStore = create<MarketRealtimeStore>((set) => ({
  isConnected: false,
  lastPulse: null,
  liveTotals: { since: null, sales: 0, amount: 0, items: 0 },
  addPulse: (pulse) =>
    set((state) => ({
      lastPulse: pulse,
      liveTotals: {
        since: state.liveTotals.since ?? pulse.at,
        sales: state.liveTotals.sales + (pulse.sales || 0),
        amount: state.liveTotals.amount + (pulse.amount || 0),
        items: state.liveTotals.items + (pulse.items || 0),
      },
    })),
  liveAlerts: [],
  recentTransactions: [],
  setConnected: (status) => set({ isConnected: status }),
  addLiveAlert: (alert) =>
    set((state) => ({
      liveAlerts: [alert, ...state.liveAlerts].slice(0, 20),
    })),
  addLiveTransaction: (tx) =>
    set((state) => ({
      recentTransactions: [tx, ...state.recentTransactions].slice(0, 30),
    })),
}));