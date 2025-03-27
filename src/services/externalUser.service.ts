import { IOReturn, Status } from '../models/io.model';
import { Server } from 'socket.io';
import { IOInteract } from '../socket/IOInstance';
import { users } from '..';
import { User } from '../models/user.model';

export const handleGetBalance = (clientSocketId: string) => {
  for (let i = 0; i < users.length; i++) {
    if (users[i].socketId == clientSocketId) {
      IOInteract.instance.getBalance(users[i].id, (returnData: IOReturn) => {
        const socket = IOInteract.instance.socket;
        if (!socket) return;

        if (returnData.status === Status.Success) {
          socket.emit('balance', returnData.data.balance);
        } else {
          socket.emit('status', { message: returnData.message });
        }
      });
    }
  }
};

export const getMoneyForUser = (user: User) => {
  IOInteract.instance.getBalance(user.id, (returnData: IOReturn) => {
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      const socket = IOInteract.instance.socket;
      if (socket) socket.emit('status', { message: returnData.message });
    }
  });
};

export const deductMoneyForUser = (user: User, amount: number) => {
  IOInteract.instance.deductBalance(user.id, amount, (returnData: IOReturn) => {
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      const socket = IOInteract.instance.socket;
      if (socket) socket.emit('status', { message: returnData.message });
    }
  });
};

export const addMoneyForUser = (user: User, amount: number) => {
  IOInteract.instance.addBalance(user.id, amount, (returnData: IOReturn) => {
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      const socket = IOInteract.instance.socket;
      if (socket) socket.emit('status', { message: returnData.message });
    }
  });
};