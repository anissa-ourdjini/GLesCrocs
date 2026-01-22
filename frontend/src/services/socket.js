import { io } from 'socket.io-client';
import { API_URL } from './api';

let socket = null;

export function connectSocket() {
  if (!socket) {
    socket = io(API_URL);
    socket.on('connect', () => console.log('Socket connecté'));
  }
  return socket;
}

export function getSocket() {
  return socket;
}