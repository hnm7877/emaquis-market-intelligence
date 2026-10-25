import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '@/lib/auth';

let socket: Socket | null = null;

export const getMarketSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    // Domaine du site + /rt (relayé vers l'API par le serveur Next) : adresse de l'API jamais exposée
    socket = io(`${window.location.origin}/market-intelligence`, {
      path: '/rt',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      closeOnBeforeunload: true,
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      // Token relu à chaque (re)connexion : le serveur refuse les clients non authentifiés
      auth: (cb) => cb({ token: getAuthToken() }),
    });

    socket.on('unauthorized', () => {
      console.warn('🔒 [WebSocket] Accès refusé : session Market Intelligence requise');
      socket?.disconnect();
    });

    socket.on('connect', () => {
      console.log('📡 [WebSocket] Connecté au serveur Market Intelligence:', socket?.id);
      socket?.emit('subscribe_market_live');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ [WebSocket] Déconnecté du flux Market Intelligence:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ [WebSocket] Erreur de connexion:', error.message);
    });
  }

  return socket as Socket;
};

/** Ferme la connexion temps réel (déconnexion) */
export const closeMarketSocket = () => {
  socket?.disconnect();
  socket = null;
};
