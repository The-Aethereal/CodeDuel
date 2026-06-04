import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

// Initialize socket instance lazily with clean options
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // Connect explicitly when authenticated
  withCredentials: true,
  transports: ['websocket'], // Force pure WebSocket communication for lower overhead
});