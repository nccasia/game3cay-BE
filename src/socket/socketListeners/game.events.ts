import { Server, Socket } from 'socket.io';
import { findRoomById } from '../../services/room.service';
import { getUserBySocketId, getUserInfo, removeUserBySocketId as disconnectUser } from '../../services/user.service';
import { PokerGame } from '../../services/poker.service';
import { BOT_ID, APP_ID, maxCoefficient } from '../../config/constants';
import { generateSessionId, getRoomMembers } from '../../utils/game.utils';
import { dealCards, leaveRoom, roomGames } from '../../services/game.service';
import { handleBetResults } from './room.events';
import axios from 'axios';
import { sendRewards } from '../../services/reward.service';
import { Room } from '../../models/room.model';

export const handleStartGame = (io: Server, socket: Socket, data: any) => {
    const room = findRoomById(data.roomId);
    if (!room) {
        io.to(socket.id).emit('status', { message: 'Room not found' });
        return;
    }
    if (room.members.length < 2) {
        io.to(room.id).emit('status', { message: 'Not enough players' });
        return;
    }
    if (room.readyPlayer.length !== room.members.length) {
        io.to(room.id).emit('status', { message: 'Not all players are ready' });
        return;
    }

    const owner = getUserInfo(room.owner);
    if (!owner || owner.wallet < room.betAmount * maxCoefficient * (room.members.length - 1)) {
        io.to(room.id).emit('status', { message: 'Owner does not have enough tokens' });
        return;
    }

    const insufficientFunds = room.members.some(id => {
        const user = getUserInfo(id);
        return !user || user.wallet < room.betAmount * maxCoefficient;
    });

    if (insufficientFunds) {
        io.to(room.id).emit('status', { message: 'Some members do not have enough tokens' });
        return;
    }

    if (!roomGames[room.id]) {
        roomGames[room.id] = new PokerGame();
    }

    room.allUserConfirmed = true;
    room.userConfirmed = [];
    room.sessionId = generateSessionId();

    const roomMembers = getRoomMembers(room);
    roomMembers?.forEach(id => {
        const user = getUserInfo(id);
        if (!user) return;

        const totalBet = user.id === room.medalHolder
            ? room.betAmount * maxCoefficient * (room.members.length - 1)
            : room.betAmount * maxCoefficient;

        io.to(user.socketId).emit('startBet', {
            gameId: room.id,
            totalBet,
            receiverId: BOT_ID,
            appId: APP_ID,
            currentGameId: room.sessionId
        });

        user.wallet -= totalBet;
    });

    setTimeout(() => {
        const room = findRoomById(data.roomId);
        if (!room) return;
        if (room.allUserConfirmed || room.userConfirmed.length === room.members.length) {
            dealCards(io, room);
        } else {
            io.to(room.id).emit('userConfirmed', { message: 'Not all users confirmed' });
            const userRewards: { userId: string, amount: number }[] = [];
            for (let i = 0; i < room.userConfirmed.length; i++) {
                const user = getUserInfo(room.userConfirmed[i]);
                if (user) {
                    userRewards.push({ userId: user.id, amount: room.betAmount * maxCoefficient });
                    user.wallet += room.betAmount * maxCoefficient;
                }
            }
            sendRewards(room.sessionId, userRewards);
        }
    }, 10000);
};

export const handleEndGame = (io: Server, socket: Socket, data: any) => {
    const room = findRoomById(data.roomId);
    if (!room) return;
    room.isPlaying = false;
    const medalHolder = getUserInfo(room.medalHolder);
    if (medalHolder?.id === data.userId) {
        const userList = room.members
            .map(id => getUserInfo(id))
            .filter((u): u is NonNullable<typeof u> => Boolean(u));
        const playerRanks = roomGames[room.id].determineWinner(userList);
        handleBetResults(io, room, playerRanks);
    }
};

export const handleDisconnect = (io: Server, socket: Socket, rooms: Room[]) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;
  
    rooms.forEach(room => {
      if (room.members.includes(user.id)) {
        leaveRoom(io, room, user.id);
      }
    });
  
    disconnectUser(socket.id);
  };




