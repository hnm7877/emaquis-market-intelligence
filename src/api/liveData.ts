import { getMarketSocket } from './socket';

/**
 * Données poussées par le serveur via WebSocket (mi:subscribe → mi:data).
 * - Un abonnement par donnée + filtres, partagé entre tous les composants qui l'affichent.
 * - Réabonnement automatique à chaque (re)connexion.
 * - Aucune interrogation répétée : le serveur pousse les nouveaux chiffres quand des ventes arrivent.
 */
export type LiveResource =
  | 'overview'
  | 'contextual'
  | 'geography'
  | 'products'
  | 'brands'
  | 'categories'
  | 'trends'
  | 'stock'
  | 'coverage'
  | 'promotions'
  | 'filters'
  | 'productDetail'
  | 'competition';

/** Même ordre de clés que le serveur (et que les requêtes HTTP) : même clé, même cache */
const FILTER_KEYS = ['country', 'dateRange', 'startDate', 'endDate', 'city', 'commune', 'category', 'brand', 'posType', 'status', 'product', 'compare'] as const;

export function liveFilters(params: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of FILTER_KEYS) if (typeof params[k] === 'string' && params[k]) out[k] = params[k];
  return out;
}

export const liveKey = (resource: LiveResource, filters: Record<string, string>) =>
  `${resource}:${JSON.stringify(filters)}`;

type Listener = (data: unknown) => void;
type Entry = { resource: LiveResource; filters: Record<string, string>; listeners: Set<Listener>; last?: unknown };

const entries = new Map<string, Entry>();
let bound = false;

function bind() {
  if (bound || typeof window === 'undefined') return;
  const socket = getMarketSocket();
  if (!socket) return;
  bound = true;
  socket.on('mi:data', (msg: { key: string; data: unknown }) => {
    const e = entries.get(msg?.key);
    if (!e) return;
    e.last = msg.data;
    e.listeners.forEach((fn) => fn(msg.data));
  });
  // (Re)connexion : tous les abonnements en cours sont rejoués
  socket.on('connect', () => {
    for (const e of entries.values()) socket.emit('mi:subscribe', { resource: e.resource, filters: e.filters });
  });
}

/** S'abonne à une donnée ; renvoie la fonction de désabonnement. */
export function subscribeLive(resource: LiveResource, filters: Record<string, string>, fn: Listener): () => void {
  bind();
  const key = liveKey(resource, filters);
  let e = entries.get(key);
  if (!e) {
    e = { resource, filters, listeners: new Set() };
    entries.set(key, e);
    const socket = getMarketSocket();
    if (socket?.connected) socket.emit('mi:subscribe', { resource, filters });
  }
  e.listeners.add(fn);
  return () => {
    const cur = entries.get(key);
    if (!cur) return;
    cur.listeners.delete(fn);
    if (cur.listeners.size === 0) {
      entries.delete(key);
      const socket = getMarketSocket();
      if (socket?.connected) socket.emit('mi:unsubscribe', { resource, filters });
    }
  };
}

export const isLiveConnected = () => typeof window !== 'undefined' && !!getMarketSocket()?.connected;

/** Attend la connexion du direct (au premier chargement de la page) ; false si elle tarde. */
export function waitForLive(timeoutMs = 3000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const socket = getMarketSocket();
  if (!socket) return Promise.resolve(false);
  if (socket.connected) return Promise.resolve(true);
  return new Promise((resolve) => {
    const onConnect = () => {
      clearTimeout(t);
      resolve(true);
    };
    const t = setTimeout(() => {
      socket.off('connect', onConnect);
      resolve(false);
    }, timeoutMs);
    socket.once('connect', onConnect);
  });
}

/**
 * Première valeur poussée par le serveur (direct actif) ; null si elle n'arrive pas à temps,
 * pour basculer sur une requête HTTP classique.
 */
export function firstLiveValue<T>(resource: LiveResource, filters: Record<string, string>, timeoutMs = 8000): Promise<T | null> {
  const known = entries.get(liveKey(resource, filters))?.last;
  if (known !== undefined) return Promise.resolve(known as T);
  return new Promise((resolve) => {
    let done = false;
    const off = subscribeLive(resource, filters, (data) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      queueMicrotask(off);
      resolve(data as T);
    });
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      off();
      resolve(null);
    }, timeoutMs);
  });
}
