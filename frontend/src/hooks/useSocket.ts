'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit('join-room', room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('leave-room', room);
  }, []);

  const sendMessage = useCallback((room: string, data: unknown) => {
    socketRef.current?.emit('message', { room, data });
  }, []);

  return { socket: socketRef, joinRoom, leaveRoom, sendMessage };
}
