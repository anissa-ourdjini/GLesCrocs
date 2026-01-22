import { io } from 'socket.io-client';
import { API_URL } from './api';

let socket = null;

export function connectSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 5
    });
    socket.on('connect', () => console.log('Socket connecté'));
    socket.on('connect_error', (err) => console.error('Socket erreur:', err.message));
  }
  return socket;
}

export function getSocket() {
  return socket;
}