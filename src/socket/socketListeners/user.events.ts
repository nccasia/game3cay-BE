import { Socket, Server } from 'socket.io';
import { getUserBySocketId, disconnectUser, addUser } from '../../services/user.service';
import { User } from '../../models/user.model';

export const handleUserInfo = (io: Server, socket: Socket, userInfo: User) => {
  const existing = getUserBySocketId(socket.id);
  if (existing) disconnectUser(socket.id);

  addUser(userInfo);
};