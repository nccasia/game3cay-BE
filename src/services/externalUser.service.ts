import { IOReturn, Status } from '../models/io.model';
import { User } from '../models/user.model';
import { Server } from 'socket.io';
import { IOInteract } from '../socket/IOInstance';

export const handleGetBalance = (io: Server, clientSocketId: string, userId: string) => {
  IOInteract.instance.getBalance(userId, (returnData: IOReturn) => {
    const socket = io.sockets.sockets.get(clientSocketId);
    if (!socket) return;

    if (returnData.status === Status.Success) {
      socket.emit('balance', returnData.data.balance);
    } else {
      socket.emit('warning', { message: returnData.message });
    }
  });
};

export const getMoneyForUser = (user: User, io: Server) => {
  IOInteract.instance.getBalance(user.id, (returnData: IOReturn) => {
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      const socket = io.sockets.sockets.get(user.socketId);
      if (socket) socket.emit('warning', { message: returnData.message });
    }
  });
};

export const deductMoneyForUser = (user: User, amount: number, io: Server) => {
  IOInteract.instance.deductBalance(user.id, amount, (returnData: IOReturn) => {
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      const socket = io.sockets.sockets.get(user.socketId);
      if (socket) socket.emit('warning', { message: returnData.message });
    }
  });
};

export const addMoneyForUser = (user: User, amount: number, io: Server) => {
  IOInteract.instance.addBalance(user.id, amount, (returnData: IOReturn) => {
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      const socket = io.sockets.sockets.get(user.socketId);
      if (socket) socket.emit('warning', { message: returnData.message });
    }
  });
};