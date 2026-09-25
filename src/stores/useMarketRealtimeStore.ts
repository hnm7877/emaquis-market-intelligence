import { create } from 'zustand';
import { MarketAlert } from '@/types/market';

export interface LiveSaleTransaction {
  id: string;
  establishmentName: string;
  city: string;
  commune: string;
  amount: number;
  productsCount: number;
  timestamp: string;
}

interface MarketRealtimeStore {
  isConnected: boolean;
  liveAlerts: MarketAlert[];
  recentTransactions: LiveSaleTransaction[];
  setConnected: (status: boolean) => void;
  addLiveAlert: (alert: MarketAlert) => void;
  addLiveTransaction: (tx: LiveSaleTransaction) => void;
}

export const useMarketRealtimeStore = create<MarketRealtimeStore>((set) => ({
  isConnected: false,
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