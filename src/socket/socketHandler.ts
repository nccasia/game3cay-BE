import { Server, Socket } from 'socket.io';
import { handleJoinRoom, handleCreateRoom, handleLeaveRoom, handleListRoom } from './socketListeners/room.events';
import { handleUserInfo } from './socketListeners/user.events';
import { handleAgreeGame, handleCancelBet, handleConfirmBet } from './socketListeners/ready.events';
import { handleDisconnect, handleEndGame, handleStartGame } from './socketListeners/game.events';
import { getRooms } from '../services/room.service';

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('createRoom', (data) => handleCreateRoom(io, socket, data));
    socket.on('joinRoom', (data) => handleJoinRoom(io, socket, data));
    socket.on('leaveRoom', (data) => handleLeaveRoom(io, socket, data));
    socket.on('listRoom', () => handleListRoom(io, socket));

    socket.on('userInfo', (data) => handleUserInfo(io, socket, data));

    socket.on('agreeGame', (data) => handleAgreeGame(io, socket, data));
    socket.on('userConfirmBet', (data) => handleConfirmBet(io, socket, data));
    socket.on('userCancelBet', (data) => handleCancelBet(io, socket, data));

    socket.on('startGame', (data) => handleStartGame(io, socket, data));
    socket.on('endGame', (data) => handleEndGame(io, socket, data));

    socket.on('disconnect', () => handleDisconnect(io, socket, getRooms()));
  });
};