import { Room } from '../models/room.model';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user.model';
import { ensureUserExists } from './user.service';
import { PokerGame } from './poker.service';
import { roomGames } from './game.service';

const rooms: Room[] = [];

export const getRooms = () => rooms;

export const findRoomById = (id: string): Room | undefined =>
  rooms.find(room => room.id === id);

export const removeRoomById = (id: string) => {
  const index = rooms.findIndex(room => room.id === id);
  if (index !== -1) rooms.splice(index, 1);
};

export const createRoom = (name: string, betAmount: number): Room => {
  const room: Room = {
    id: generateRoomId(),
    name,
    wallet: 0,
    members: [],
    isPlaying: false,
    owner: '',
    readyPlayer: [],
    medalHolder: '',
    sessionId: '',
    betAmount,
    allUserConfirmed: true,
    userConfirmed: []
  };
  rooms.push(room);
  return room;
};

export const generateRoomId = (): string => {
  let id: string;
  do {
    id = uuidv4().replace(/-/g, '').substring(0, 10);
  } while (rooms.some(room => room.id === id));
  return id;
};

export const joinRoom = (roomId: string, userInfo: User): boolean => {
  const room = rooms.find(room => room.id === roomId);
  if (!room) return false;

  if (room.isPlaying) {
    console.log(`Room ${roomId} is already in a game.`);
    return false;
  }

  ensureUserExists(userInfo);

  if (!room.members.includes(userInfo.id)) {
    room.members.push(userInfo.id);
    if (!room.owner || room.members.length < 2) {
      room.owner = userInfo.id;
      room.medalHolder = userInfo.id;
    }
    if (!roomGames[room.id]) {
      roomGames[room.id] = new PokerGame();
    }
    roomGames[room.id]._playerName = room.members;
    return true;
  }
  return false;
};

export const removeEmptyRooms = () => {
  rooms.forEach(room => {
    if (room.members.length === 0) {
      const roomIndex = rooms.findIndex(r => r.id === room.id);
      if (roomIndex !== -1) {
        rooms.splice(roomIndex, 1);
      }
    }
  });
}
