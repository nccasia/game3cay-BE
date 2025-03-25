import { User } from '../models/user.model';

const users: User[] = [];

export const addUser = (user: User) => {
  users.push(user);
};

export const getUserInfo = (id: string): User | undefined =>
  users.find(user => user.id === id);

export const getUserBySocketId = (socketId: string): User | undefined =>
  users.find(user => user.socketId === socketId);

export const getSocketIdOfUser = (id: string): string | undefined => {
  const user = getUserInfo(id);
  return user?.socketId;
};

export const removeUserBySocketId = (socketId: string) => {
  const index = users.findIndex(user => user.socketId === socketId);
  if (index !== -1) users.splice(index, 1);
};

export const getAllUsers = (): User[] => users;

export const disconnectUser = (socketId: string) => {
  const index = users.findIndex((user) => user.socketId === socketId);
  if (index !== -1) users.splice(index, 1);
};

export const ensureUserExists = (userInfo: User): void => {
  const existing = getUserInfo(userInfo.id);
  if (!existing) users.push(userInfo);
};