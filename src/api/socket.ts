import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getMarketSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001/market-intelligence';
    
    socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
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