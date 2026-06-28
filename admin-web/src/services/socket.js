import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Extract base url by removing '/api' from the end if it exists
const BASE_URL = API_URL.replace(/\/api\/?$/, '');

const getToken = () => localStorage.getItem('cv_token');

export const socket = io(BASE_URL, {
  withCredentials: true,
  autoConnect: false,
  auth: (cb) => {
    cb({ token: getToken() });
  }
});

export const connectSocket = () => {
  if (!socket.connected && getToken()) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

socket.on('connect', () => {
  console.log('[Socket] Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected from server');
});
