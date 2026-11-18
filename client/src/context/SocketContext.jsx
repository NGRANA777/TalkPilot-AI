import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

// Resolve WebSocket server URL
const resolveSocketUrl = () => {
  if (process.env.REACT_APP_SERVER_URL) {
    return process.env.REACT_APP_SERVER_URL;
  }
  // On Vercel (or any production domain), connect to window.location.origin
  // Top-level vercel.json rewrites route /socket.io/* directly to the server service
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const userId = (user?.id || user?._id || '').toString();
  const userEmail = (user?.email || '').toLowerCase().trim();

  useEffect(() => {
    const serverUrl = resolveSocketUrl();

    if (userId && serverUrl) {
      try {
        // Vercel native WebSockets require direct 'websocket' transport to bypass HTTP long-polling handshakes
        const newSocket = io(serverUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000
        });

        newSocket.on('connect', () => {
          console.log('[SocketContext] Connected to Socket.IO server via WebSocket:', newSocket.id);
          newSocket.emit('join:user', {
            userId,
            email: userEmail
          });
        });

        newSocket.on('connect_error', (err) => {
          console.warn('[SocketContext] WebSocket connection warning (falling back to REST endpoints if needed):', err.message);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
          newSocket.disconnect();
          socketRef.current = null;
        };
      } catch (err) {
        console.warn('[SocketContext] Initialization error:', err);
      }
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
    }
  }, [userId, userEmail]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
