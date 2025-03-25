import { Server, Socket } from 'socket.io';
import { createRoom, getRooms, findRoomById } from '../../services/room.service';

export const handleJoinRoom = (io: Server, socket: Socket, data: any) => {
  const room = findRoomById(data.roomId);
  if (!room) {
    socket.emit('status', { message: 'Room not found' });
    return;
  }
  socket.join(room.id);
  socket.emit('roomJoined', { roomId: room.id, room });
  io.emit('listRoom', getRooms());
};

export const handleCreateRoom = (io: Server, socket: Socket, data: any) => {
  const room = createRoom(data.name, data.betAmount);
  socket.join(room.id);
  socket.emit('roomCreated', { roomId: room.id });
  io.emit('listRoom', getRooms());
};