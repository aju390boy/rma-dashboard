import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useToast } from './ToastContext';
import { useQueryClient } from '@tanstack/react-query';

const SocketContext = createContext(null);

const EVENT_CONFIG = {
  'rma:new_return': {
    type: 'warning',
    title: '↩ New Return Request',
    getMessage: (d) => `${d.customerName} — ${d.orderNumber}`,
  },
  'rma:approved': {
    type: 'success',
    title: '✔ Return Approved',
    getMessage: (d) => `${d.orderNumber} approved by ${d.performedBy}`,
  },
  'rma:rejected': {
    type: 'error',
    title: '✖ Return Rejected',
    getMessage: (d) => `${d.orderNumber} rejected by ${d.performedBy}`,
  },
  'rma:refund_initiated': {
    type: 'info',
    title: '💳 Refund Initiated',
    getMessage: (d) => `${d.orderNumber} — refund processing`,
  },
  'rma:refunded': {
    type: 'success',
    title: '💚 Refund Complete',
    getMessage: (d) => `${d.orderNumber} — $${d.refundAmount?.toFixed(2)} credited`,
  },
};

export const SocketProvider = ({ children }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:dashboard');
      console.log('🔌 Socket connected:', socket.id);
    });

    // Register all RMA event listeners
    Object.entries(EVENT_CONFIG).forEach(([event, config]) => {
      socket.on(event, (data) => {
        toast[config.type](config.title, config.getMessage(data));
        // Invalidate relevant queries so tables update
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['order-stats'] });
        queryClient.invalidateQueries({ queryKey: ['pending-rmas'] });
      });
    });

    socket.on('disconnect', () => console.log('❌ Socket disconnected'));

    return () => socket.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
