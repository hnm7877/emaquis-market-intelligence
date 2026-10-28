'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parsePublicBoard, type BoardWindow, type PublicBoard } from '@/lib/validations/public-board.schema';
import { usePublicBoardStore } from '@/stores/usePublicBoardStore';

export const publicBoardKey = (scope: string, window: BoardWindow) => ['public-board', scope, window] as const;

async function fetchBoard(scope: string, window: BoardWindow): Promise<PublicBoard> {
  const r = await fetch(`/api-proxy/market-public/board?scope=${encodeURIComponent(scope)}&window=${window}`, { credentials: 'omit' });
  if (!r.ok) throw new Error('Classement indisponible');
  const b = parsePublicBoard(await r.json());
  if (!b) throw new Error('Classement invalide');
  return b;
}

let socket: Socket | null = null;
function publicSocket(): Socket {
  // Même domaine que le site (/rt relayé par le serveur Next) : l'adresse de l'API reste cachée
  socket ??= io(`${window.location.origin}/market-public`, {
    path: '/rt',
    addTrailingSlash: false,
    transports: ['websocket', 'polling'],
    withCredentials: false,
    reconnectionDelay: 3000,
  });
  return socket;
}

/**
 * Classement public en direct : première valeur rendue par le serveur (aucune attente),
 * puis mises à jour poussées par WebSocket à chaque changement (React Query + contrôle Zod).
 */
export function usePublicBoard(initial: PublicBoard | null) {
  const qc = useQueryClient();
  const { scope, window: win, ingest, setConnected } = usePublicBoardStore();

  const query = useQuery({
    queryKey: publicBoardKey(scope, win),
    queryFn: () => fetchBoard(scope, win),
    initialData: initial && initial.scope === scope && initial.window === win ? initial : undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  // Classement rendu par le serveur : point de départ pour détecter les dépassements
  useEffect(() => {
    if (initial) ingest(`${initial.scope}:${initial.window}`, initial.items);
  }, [initial, ingest]);

  useEffect(() => {
    const s = publicSocket();
    const watch = () => s.emit('board:watch', { scope, window: win });
    const onBoard = (raw: unknown) => {
      const b = parsePublicBoard(raw);
      if (!b) return;
      ingest(`${b.scope}:${b.window}`, b.items);
      qc.setQueryData(publicBoardKey(b.scope, b.window), b);
    };
    const onConnect = () => {
      setConnected(true);
      watch();
    };
    const onDisconnect = () => setConnected(false);
    s.on('board', onBoard);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    if (s.connected) onConnect();
    return () => {
      s.off('board', onBoard);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [scope, win, qc, ingest, setConnected]);

  return query;
}
