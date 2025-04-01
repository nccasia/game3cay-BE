import { IOReturn, Status } from '../models/io.model';
import { Server } from 'socket.io';
import { IOInteract } from '../socket/IOInstance';
import { ioToFe, users } from '..';
import { User } from '../models/user.model';

export const handleGetBalance = (userId: string) => {
  console.log(`handleGetBalance:${userId}`);
  for (let i = 0; i < users.length; i++) {
    console.log(`users[i]:${users[i].id}`);
    if (users[i].id == userId) {
      IOInteract.instance.getBalance(users[i].id, (returnData: IOReturn) => {
        console.log(`handleGetBalance user_____:${users[i].socketId}`);
        if (returnData.status === Status.Success) {
          ioToFe.to(users[i].socketId).emit('balance', returnData.data.balance);
        } else {
          ioToFe.to(users[i].socketId).emit('status', { message: returnData.message });
        }
      });
    }
  }
};

export const getMoneyForUser = (user: User) => {
  IOInteract.instance.getBalance(user.id, (returnData: IOReturn) => {
    console.log(`getMoneyForUser:${user.username} ${returnData.status} ${returnData.data.balance}`);


    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
      ioToFe.to(user.socketId).emit('balance', returnData.data.balance);
    } else {
      ioToFe.to(user.socketId).emit('balance', 0);
      ioToFe.to(user.socketId).emit('status', { message: returnData.message });
    }
  });
};

export const deductMoneyForUser = (user: User, amount: number) => {
  IOInteract.instance.deductBalance(user.id, amount, (returnData: IOReturn) => {
    console.log(`deductMoneyForUser:${user.username} ${returnData.status} ${returnData.data.balance}`);
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      ioToFe.to(user.socketId).emit('status', { message: returnData.message });
    }
  });
};

export const addMoneyForUser = (user: User, amount: number) => {
  IOInteract.instance.addBalance(user.id, amount, (returnData: IOReturn) => {
    console.log(`addMoneyForUser:${user.username} ${returnData.status} ${returnData.data.balance}`);
    if (returnData.status === Status.Success) {
      user.wallet = returnData.data.balance;
    } else {
      ioToFe.to(user.socketId).emit('status', { message: returnData.message });
    }
  });
};