import { create } from 'zustand';
import type { BoardWindow, PublicBoardItem } from '@/lib/validations/public-board.schema';

export interface Overtake {
  id: string;
  winner: string;
  loser: string;
  rank: number;
  at: number;
}

interface PublicBoardUi {
  scope: string;
  window: BoardWindow;
  connected: boolean;
  /** Dernier classement reçu par périmètre (pour détecter les dépassements) */
  last: Record<string, PublicBoardItem[]>;
  overtakes: Overtake[];
  setScope: (scope: string) => void;
  setWindow: (w: BoardWindow) => void;
  setConnected: (c: boolean) => void;
  /** Compare au classement précédent du même périmètre et retient les dépassements */
  ingest: (key: string, items: PublicBoardItem[]) => Overtake[];
}

/** Produits qui ont gagné des places, et ceux qu'ils ont dépassés */
export function detectOvertakes(prev: PublicBoardItem[], next: PublicBoardItem[], now = Date.now()): Overtake[] {
  if (!prev.length) return [];
  const before = new Map(prev.map((i) => [i.name, i.rank]));
  const out: Overtake[] = [];
  for (const item of next) {
    const old = before.get(item.name);
    if (old == null || item.rank >= old) continue;
    // Dépassé : était devant et se retrouve derrière
    const loser = next
      .filter((o) => {
        const was = before.get(o.name);
        return o.name !== item.name && was != null && was >= item.rank && was < old && o.rank > item.rank;
      })
      .sort((a, b) => (before.get(a.name) ?? 0) - (before.get(b.name) ?? 0))[0];
    if (loser) out.push({ id: `${now}-${item.name}`, winner: item.name, loser: loser.name, rank: item.rank, at: now });
  }
  return out;
}

export const usePublicBoardStore = create<PublicBoardUi>((set, get) => ({
  scope: 'all',
  window: '24h',
  connected: false,
  last: {},
  overtakes: [],
  setScope: (scope) => set({ scope }),
  setWindow: (window) => set({ window }),
  setConnected: (connected) => set({ connected }),
  ingest: (key, items) => {
    const found = detectOvertakes(get().last[key] ?? [], items);
    set((s) => ({
      last: { ...s.last, [key]: items },
      overtakes: found.length ? [...found, ...s.overtakes].slice(0, 12) : s.overtakes,
    }));
    return found;
  },
}));
