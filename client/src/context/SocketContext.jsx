import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

// Resolve WebSocket server URL
const resolveSocketUrl = () => {
  if (process.env.REACT_APP_SERVER_URL) {
    return process.env.REACT_APP_SERVER_URL;
  }
  // In production environments (like Vercel), if no explicit persistent server URL is provided,
  // we do not attempt to connect to localhost:5000.
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return null;
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
        const newSocket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          timeout: 6000
        });

        newSocket.on('connect', () => {
          console.log('[SocketContext] Connected to Socket.IO server:', newSocket.id);
          newSocket.emit('join:user', {
            userId,
            email: userEmail
          });
        });

        newSocket.on('connect_error', (err) => {
          console.warn('[SocketContext] WebSocket unavailable, operating via REST APIs:', err.message);
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
