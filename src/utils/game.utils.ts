import { Room } from '../models/room.model';
import { getUserInfo } from '../services/user.service';

export const getRoomMembers = (room: Room): string[] => {
  return room.members;
};

export const getRoomMembersName = (room: Room): string[] => {
  return room.members
    .map(id => getUserInfo(id)?.username || '')
    .filter(name => name !== '');
};

export const generateSessionId = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
};
