import { Room } from '../models/room.model';
import { PokerGame } from './poker.service';
import { getRoomMembers, getRoomMembersName, generateSessionId } from '../utils/game.utils';
import { getUserById, removeUserBySocketId } from './user.service';
import { Server, Socket } from 'socket.io';
import { MAX_COEFFICIENT, BOT_ID, APP_ID } from '../config/constants';
import { sendRewards } from './reward.service';

const roomGames: Record<string, PokerGame> = {};
let playerRanks: any[] = [];

export const dealCards = (io: Server, room: Room) => {
  const game = new PokerGame();
  roomGames[room.id] = game;

  const members = getRoomMembers(room);
  game._playersNum = members.length;
  game._playerName = getRoomMembersName(room);
  game.takePoker(game._playersNum);

  playerRanks = game.determineWinner(members.map(id => getUserById(id)!).filter(Boolean));
  room.isPlaying = true;

  io.to(room.id).emit('startedGame', {
    playerHoleCards: game._playerHoleCards,
    playerRanks,
  });
};

export const handleBetResults = async (io: Server, room: Room) => {
  const game = roomGames[room.id];
  if (!game) return;

  const medalHolder = getUserById(room.medalHolder);
  if (!medalHolder) return;

  const updates: { userId: string; wallet: number }[] = [];
  const userRewards: { userId: string, amount: number }[] = [];

  for (const player of playerRanks) {
    if (player.userInfo.id === medalHolder.id) continue;

    const reward = room.betAmount * MAX_COEFFICIENT;
    player.userInfo.wallet += reward;
    userRewards.push({ userId: player.userInfo.id, amount: reward });
    updates.push({ userId: player.userInfo.id, wallet: player.userInfo.wallet });
  }

  const medalReward = room.betAmount * MAX_COEFFICIENT * (room.members.length - 1);
  medalHolder.wallet += medalReward;
  userRewards.push({ userId: medalHolder.id, amount: medalReward });
  updates.push({ userId: medalHolder.id, wallet: medalHolder.wallet });

  await sendRewards(room.sessionId, userRewards);
  io.to(room.id).emit('playerWalletUpdated', updates);
};

export const startGame = (io: Server, socket: Socket, room: Room) => {
  const owner = getUserById(room.owner);
  if (!owner || owner.wallet < room.betAmount * MAX_COEFFICIENT * (room.members.length - 1)) {
    io.to(room.id).emit('status', { message: 'Owner does not have enough tokens' });
    return;
  }

  const insufficient = room.members.some(id => {
    const user = getUserById(id);
    return !user || user.wallet < (id === room.medalHolder ? room.betAmount * MAX_COEFFICIENT * (room.members.length - 1) : room.betAmount * MAX_COEFFICIENT);
  });

  if (insufficient) {
    io.to(room.id).emit('status', { message: 'Some members do not have enough tokens' });
    return;
  }

  room.sessionId = generateSessionId();
  room.allUserConfirmed = true;
  room.userConfirmed = [];

  for (const memberId of room.members) {
    const user = getUserById(memberId);
    if (!user) continue;
    const amount = memberId === room.medalHolder
      ? room.betAmount * MAX_COEFFICIENT * (room.members.length - 1)
      : room.betAmount * MAX_COEFFICIENT;
    user.wallet -= amount;
    io.to(user.socketId).emit('startBet', {
      gameId: room.id,
      totalBet: amount,
      receiverId: BOT_ID,
      appId: APP_ID,
      currentGameId: room.sessionId,
    });
  }

  setTimeout(() => {
    if (room.allUserConfirmed || room.userConfirmed.length === room.members.length) {
      dealCards(io, room);
    } else {
      io.to(room.id).emit('userConfirmed', { message: 'Not all users confirmed' });
      const refunds: { userId: string, amount: number }[] = [];
      for (const uid of room.userConfirmed) {
        const user = getUserById(uid);
        if (user) {
          const refund = room.betAmount * MAX_COEFFICIENT;
          user.wallet += refund;
          refunds.push({ userId: uid, amount: refund });
        }
      }
      sendRewards(room.sessionId, refunds);
    }
  }, 10000);
};

export const leaveRoom = (io: Server, room: Room, userId: string) => {
  room.members = room.members.filter(id => id !== userId);
  room.readyPlayer = room.readyPlayer.filter(id => id !== userId);

  if (room.owner === userId && room.members.length > 0) {
    room.owner = room.members[0];
    io.to(room.id).emit('updateOwner', {
      roomOwner: room.owner,
      roomMembers: room.members
    });
  }

  if (room.members.length === 0) {
    delete roomGames[room.id];
  }

  io.to(room.id).emit('roomLeft', {
    message: `User ${userId} left the room`,
    roomMembers: room.members
  });
};

export const handleDisconnect = (io: Server, socket: Socket, rooms: Room[]) => {
  const user = getUserById(socket.id);
  if (!user) return;

  rooms.forEach(room => {
    if (room.members.includes(user.id)) {
      leaveRoom(io, room, user.id);
    }
  });

  removeUserBySocketId(socket.id);
};