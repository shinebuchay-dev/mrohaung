'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Initialize socket connection
        socket = io(SOCKET_URL, {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        return () => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        };
    }, []);

    return { socket, isConnected };
};

export const getSocket = () => socket;
