import { Room } from '../models/room.model';
import { v4 as uuidv4 } from 'uuid';

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
