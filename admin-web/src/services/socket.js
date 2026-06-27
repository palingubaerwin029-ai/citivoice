import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Extract base url by removing '/api' from the end if it exists
const BASE_URL = API_URL.replace(/\/api\/?$/, '');

export const socket = io(BASE_URL, {
  withCredentials: true,
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('[Socket] Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected from server');
});
