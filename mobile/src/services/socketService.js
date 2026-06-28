import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../context/AuthContext';

// Extract base url by removing '/api' if it exists
const SOCKET_URL = BASE_URL.replace(/\/api\/?$/, '');

let socket = null;

export const SocketService = {
  async connect() {
    if (socket?.connected) return;

    const token = await AsyncStorage.getItem('cv_token');
    if (!token) return;

    socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });
  },

  disconnect() {
    if (socket?.connected) {
      socket.disconnect();
      socket = null;
    }
  },

  on(event, callback) {
    if (!socket) return;
    socket.on(event, callback);
  },

  off(event, callback) {
    if (!socket) return;
    socket.off(event, callback);
  }
};
