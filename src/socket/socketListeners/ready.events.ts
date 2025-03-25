import { Server, Socket } from 'socket.io';
import { findRoomById } from '../../services/room.service';

export const handleAgreeGame = (io: Server, socket: Socket, data: any) => {
  const room = findRoomById(data.roomId);
  if (!room) return;

  if (data.agree) {
    if (!room.readyPlayer.includes(data.userId)) {
      room.readyPlayer.push(data.userId);
    }
  } else {
    room.readyPlayer = room.readyPlayer.filter(id => id !== data.userId);
  }

  if (!room.readyPlayer.includes(room.owner)) {
    room.readyPlayer.push(room.owner);
  }

  io.to(data.roomId).emit('playerReady', {
    owner: room.owner,
    readyPlayer: room.readyPlayer
  });
};

export const handleUserConfirmBet = (io: Server, socket: Socket, data: any) => {
  const room = findRoomById(data.roomId);
  if (!room) return;
  room.userConfirmed.push(data.userId);
};

export const handleUserCancelBet = (io: Server, socket: Socket, data: any) => {
  const room = findRoomById(data.roomId);
  if (!room) return;
  room.allUserConfirmed = false;
};