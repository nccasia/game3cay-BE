import { Room } from '../models/room.model';
import { PokerGame } from './poker.service';
import { getRoomMembers, getRoomMembersName, generateSessionId } from '../utils/game.utils';
import { getUserInfo, getUserInfo as getUserBySocketId } from './user.service';
import { Server, Socket } from 'socket.io';
import { MAX_COEFFICIENT, BOT_ID, APP_ID } from '../config/constants';
import { sendRewards } from './reward.service';

export const roomGames: Record<string, PokerGame> = {};
export let playerRanks: any[] = [];

export const dealCards = (io: Server, room: Room) => {
  const game = new PokerGame();
  roomGames[room.id] = game;

  const members = getRoomMembers(room);
  game._playersNum = members.length;
  game._playerName = getRoomMembersName(room);
  game.takePoker(game._playersNum);

  playerRanks = game.determineWinner(members.map(id => getUserBySocketId(id)!).filter(Boolean));
  room.isPlaying = true;

  io.to(room.id).emit('startedGame', {
    playerHoleCards: game._playerHoleCards,
    playerRanks,
  });
};

export const handleBetResults = async (io: Server, room: Room) => {
  const game = roomGames[room.id];
  if (!game) return;

  const medalHolder = getUserBySocketId(room.medalHolder);
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

