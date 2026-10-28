import { create } from 'zustand';
import type { PublicBoardItem } from '@/lib/validations/public-board.schema';

export interface Overtake {
  id: string;
  winner: string;
  loser: string;
  rank: number;
  at: number;
}

export interface SaleBlip {
  id: string;
  name: string;
  rank: number;
  /** Réception sur la page (tri du fil) */
  at: number;
  /** Heure réelle de la vente, lue dans la collection des ventes */
  soldAt: string;
}

interface PublicBoardUi {
  scope: string;
  connected: boolean;
  /** Dernier classement reçu par périmètre (pour détecter les dépassements) */
  last: Record<string, PublicBoardItem[]>;
  overtakes: Overtake[];
  /** Produits qui viennent de se vendre (nouvelle « dernière vente » reçue) */
  sales: SaleBlip[];
  setScope: (scope: string) => void;
  setConnected: (c: boolean) => void;
  /** Compare au classement précédent du même périmètre et retient les dépassements */
  ingest: (key: string, items: PublicBoardItem[]) => Overtake[];
}

/** Produits dont la dernière vente a changé depuis le classement précédent */
export function detectSales(prev: PublicBoardItem[], next: PublicBoardItem[], now = Date.now()): SaleBlip[] {
  if (!prev.length) return [];
  const before = new Map(prev.map((i) => [i.name, i.lastSoldAt ?? null]));
  return next
    .filter((i) => i.lastSoldAt && before.has(i.name) && before.get(i.name) !== i.lastSoldAt && (before.get(i.name) ?? '') < i.lastSoldAt)
    .map((i) => ({ id: `sale-${now}-${i.name}`, name: i.name, rank: i.rank, at: now, soldAt: i.lastSoldAt as string }));
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
    if (loser) out.push({ id: `overtake-${now}-${item.name}`, winner: item.name, loser: loser.name, rank: item.rank, at: now });
  }
  return out;
}

export const usePublicBoardStore = create<PublicBoardUi>((set, get) => ({
  scope: 'all',
  connected: false,
  last: {},
  overtakes: [],
  sales: [],
  setScope: (scope) => set({ scope }),
  setConnected: (connected) => set({ connected }),
  ingest: (key, items) => {
    const prev = get().last[key] ?? [];
    const found = detectOvertakes(prev, items);
    const sold = detectSales(prev, items);
    set((s) => ({
      last: { ...s.last, [key]: items },
      overtakes: found.length ? [...found, ...s.overtakes].slice(0, 12) : s.overtakes,
      sales: sold.length ? [...sold, ...s.sales].slice(0, 20) : s.sales,
    }));
    return found;
  },
}));
