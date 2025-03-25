import { Server, Socket } from 'socket.io';
import { getRooms, removeRoomById } from '../../services/room.service';

export const handleListRoom = (io: Server, socket: Socket) => {
  const rooms = getRooms();

  rooms.forEach(room => {
    if (room.members.length === 0) {
      removeRoomById(room.id);
    }
  });

  socket.emit('listRoom', getRooms());
};
