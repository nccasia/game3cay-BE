import { Socket } from 'socket.io';
import { addUser, removeUserBySocketId } from '../../services/user.service';
import { User } from '../../models/user.model';

export const handleUserInfo = (socket: Socket, data: User) => {
  removeUserBySocketId(socket.id);
  addUser({ ...data, socketId: socket.id });
  console.log('User added/updated:', data);
};