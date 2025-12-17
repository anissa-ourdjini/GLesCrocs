import { io } from 'socket.io-client';
import { API_URL } from './api';

let socket = null;

export function connectSocket() {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 5000,
      withCredentials: false,
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err);
    });
    socket.on('connect', () => {
      console.info('Socket connected', socket.id);
    });
    socket.on('disconnect', (reason) => {
      console.info('Socket disconnected:', reason);
    });
  }
  return socket;
}

export function getSocket() {
  return socket;
}
