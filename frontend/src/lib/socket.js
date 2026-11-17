import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false,
      transports: ['websocket'],
      // The server authenticates the socket with the login token (read fresh on every reconnect)
      auth: (cb) => cb({ token: localStorage.getItem('kabootar_token') || '' }),
    });
  }
  return socket;
};

export const connectSocket = (userId) => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.emit('register', userId);
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const getRoomId = (uid1, uid2) =>
  [uid1, uid2].sort().join('_');
