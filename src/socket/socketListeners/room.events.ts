import { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, findRoomById, getRooms, removeEmptyRooms } from '../../services/room.service';
import { getUserInfo } from '../../services/user.service';
import { getRoomMembers } from '../../utils/game.utils';
import { PokerGame } from '../../services/poker.service';
import { maxCoefficient, maxScore } from '../../config/constants';
import { playerRanks, roomGames } from '../../services/game.service';
import { sendRewards } from '../../services/reward.service';
import { Room } from '../../models/room.model';

export const handleCreateRoom = (io: Server, socket: Socket, data: any) => {
  const room = createRoom(data.name, data.betAmount);
  socket.emit('roomCreated', room.id);
  io.emit('listRoom', getRooms());
};

export const handleJoinRoom = (io: Server, socket: Socket, data: any) => {
  const room = findRoomById(data.roomId);
  if (!room) {
    socket.emit('status', { message: 'Room not found' });
    return;
  }
  if (room.isPlaying) {
    socket.emit('status', { message: 'Game already in progress' });
    return;
  }
  const roomJoined = joinRoom(data.roomId, data.userInfo);
  const roomMembers = getRoomMembers(room).map(getUserInfo).filter(Boolean);
  socket.join(data.roomId);
  if (!room.readyPlayer.includes(room.owner)) {
    room.readyPlayer.push(room.owner);
  }
  io.to(data.roomId).emit('roomJoined', {
    message: roomJoined ? `Room "${data.roomId}" joined successfully` : `Room "${data.roomId}" not found`,
    roomId: data.roomId,
    roomMembers,
    owner: room.owner
  });
};

export const handleLeaveRoom = (io: Server, socket: Socket, data: any) => {
  const room = findRoomById(data.id);
  if (room?.isPlaying) {
    socket.emit('status', { message: 'Game already in progress' });
    return;
  }
  if (room) {
    room.members = room.members.filter(id => id !== data.userId);
    room.readyPlayer = room.readyPlayer.filter(id => id !== data.userId);
    if (room.owner === data.userId && room.members.length > 0) {
      room.owner = room.members[0];
      io.to(room.id).emit('playerReady', { owner: room.owner, readyPlayer: room.readyPlayer });
    }
    socket.leave(room.id);
    io.to(room.id).emit('roomLeft', {
      message: `User left room`,
      roomMembers: getRoomMembers(room)
    });
  }
  removeEmptyRooms();
  io.emit('listRoom', getRooms());
};

export const handleListRoom = (io: Server, socket: Socket) => {
  removeEmptyRooms();
  socket.emit('listRoom', getRooms());
};

export const handleBetResults = async (io: Server, room: Room, ranks: typeof playerRanks) => {
  const medalHolder = getUserInfo(room.medalHolder);
  if (!medalHolder) return;

  const medalHolderRank = ranks.find(p => p.userInfo.id === medalHolder.id)?.rank || 0;
  const medalHolderScore = ranks.find(p => p.userInfo.id === medalHolder.id)?.score || 0;

  const updates: { userId: string; wallet: number }[] = [];
  const userRewards: { userId: string; amount: number }[] = [];

  let ownerWinCount = 0;

  for (const player of ranks) {
    if (player.userInfo.id === medalHolder.id) continue;
    const playerInfo = getUserInfo(player.userInfo.id);
    if (!playerInfo) continue;

    const game = roomGames[room.id] ?? (roomGames[room.id] = new PokerGame());

    const playerHasSap = game.hasSapCards(game._playerHoleCards[player.index]);
    const medalHasSap = game.hasSapCards(game._playerHoleCards.find((_, i) => i === ranks.find(p => p.userInfo.id === medalHolder.id)?.index) || []);
    const playerHasDongHoa = game.hasDongHoaCards(game._playerHoleCards[player.index]);
    const medalHasDongHoa = game.hasDongHoaCards(game._playerHoleCards.find((_, i) => i === ranks.find(p => p.userInfo.id === medalHolder.id)?.index) || []);

    const calc = (cond: boolean, reward: number, penalty: number) => {
      const amt = room.betAmount * (maxCoefficient + (cond ? reward : -penalty));
      userRewards.push({ userId: player.userInfo.id, amount: amt });
      player.userInfo.wallet += amt;
      ownerWinCount += cond ? -reward : penalty;
    };

    if (playerHasDongHoa && !medalHasDongHoa) calc(true, 4, 4);
    else if (!playerHasDongHoa && medalHasDongHoa) calc(false, 4, 4);
    else if (playerHasDongHoa && medalHasDongHoa) calc(player.rank < medalHolderRank, 4, 4);
    else if (playerHasSap && !medalHasSap) calc(true, 3, 3);
    else if (!playerHasSap && medalHasSap) calc(false, 3, 3);
    else if (playerHasSap && medalHasSap) calc(player.rank < medalHolderRank, 3, 3);
    else calc(player.rank < medalHolderRank, player.score === maxScore ? 2 : 1, medalHolderScore === maxScore ? 2 : 1);

    updates.push({ userId: player.userInfo.id, wallet: player.userInfo.wallet });
  }

  const medalReward = room.betAmount * maxCoefficient * (room.members.length - 1) + (ownerWinCount * room.betAmount);
  medalHolder.wallet += medalReward;
  userRewards.push({ userId: medalHolder.id, amount: medalReward });
  updates.push({ userId: medalHolder.id, wallet: medalHolder.wallet });

  await sendRewards(room.sessionId, userRewards);
  io.to(room.id).emit('playerWalletUpdated', updates);

  const winner = ranks.sort((a, b) => b.score - a.score)[0];
  if (winner?.score >= maxScore && winner.id !== room.medalHolder) {
    room.readyPlayer = room.readyPlayer.filter(p => p !== room.owner);
    room.medalHolder = winner.id;
    room.owner = winner.id;
    io.to(room.id).emit('updateOwner', {
      roomOwner: room.owner,
      roomMembers: room.members
    });
  }
};

