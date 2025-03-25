import { Server, Socket } from 'socket.io';
import { handleJoinRoom, handleCreateRoom } from './socketListeners/room.events';
import { handleUserInfo } from './socketListeners/user.events';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('joinRoom', (data) => handleJoinRoom(io, socket, data));
    socket.on('createRoom', (data) => handleCreateRoom(io, socket, data));
    socket.on('userInfo', (data) => handleUserInfo(socket, data));

    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.id}`);
    });
  });
};