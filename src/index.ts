import express, { Express, Request, Response } from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { addMoneyForUser, deductMoneyForUser, getMoneyForUser, handleGetBalance } from './services/externalUser.service';
import { IOInteract } from './socket/IOInstance';
import { User } from './models/user.model';
import { Room } from './models/room.model';

const axios = require('axios');
const port: number = parseInt(process.env.PORT || '3200', 10);

const app: Express = express();
const server: http.Server = http.createServer(app);
export const ioToFe: socketio.Server = new socketio.Server();

ioToFe.attach(server, {
    cors: {
        origin: process.env.URL || "http://localhost:3200",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header", "Access-Control-Allow-Origin"],
        credentials: true
    }
});

app.get('/hello', async (_: Request, res: Response) => {
    res.send('Hello World')
});

app.use(express.json()); // Đảm bảo bạn có body parser

app.post('/swap-token', (req: Request, res: Response) => {
    const { userId, value } = req.body;
    console.log(`swaptoken:${userId} ${value}`);
    if (!userId || !value || isNaN(value)) {
        return res.status(400).json({ message: 'Invalid parameters' });
    }
    console.log(`swap-token1231231:${userId}`);
    IOInteract.instance.getBalance(userId, (balanceData) => {
        console.log(`getBalance1231231:${userId} ${balanceData}`);
        if (balanceData.status !== 0) {
            return res.status(400).json({ message: balanceData.message });
        }

        if (balanceData.data.balance < value) {
            return res.status(400).json({ message: 'Bạn không đủ mezon token để đổi!' });
        }

        IOInteract.instance.swapToken(userId, value, (swapResult) => {
            if (swapResult.status === 0) {
                return res.status(200).json({ balance: swapResult.data.balance });
            } else {
                return res.status(400).json({ message: swapResult.message });
            }
        });
    });
});

IOInteract.instance.connect();



export const users: User[] = [];

const addUser = (id: string, username: string, displayName: string, wallet: number, avatarUrl: string, email: string, socketId: string) => {
    const user: User = { id, username, displayName, wallet, socketId, avatarUrl, email };
    users.push(user);
    getMoneyForUser(user);
};

const dealCards = (roomId: string) => {
    const room = rooms.find(room => room.id === roomId);
    if (!room) return;
    const game = roomGames[roomId];
    const roomMembers = getRoomMembers(roomId);
    game._playersNum = roomMembers ? roomMembers.length : 1;
    game._playerName = getRoomMembersName(roomId);
    game.takePoker(game._playersNum);

    const playerHoleCards = game._playerHoleCards;
    playerRanks = game.determineWinner();

    room.isPlaying = true;
    console.log('Session ID:', room.sessionId);
    ioToFe.to(roomId).emit('startedGame', {
        playerHoleCards,
        playerRanks,
    });
};

const getRoomMembersName = (roomId: string): string[] => {
    const room = rooms.find(room => room.id === roomId);
    if (room) {
        return room.members.map(memberId => {
            const user = getUserInfo(memberId);
            return user ? user.username : '';
        }).filter(username => username !== '');
    }
    return [];
};

const getUserBySocketId = (socketId: string): User | undefined => {
    return users.find(user => user.socketId === socketId);
};

const getSocketIdOfUser = (id: string): string | undefined => {
    const user = users.find(user => user.id === id);
    return user ? user.socketId : undefined;
};

const getUserInfo = (id: string): User | undefined => {
    return users.find(user => user.id === id);
};

const disconnectUser = (socketId: string) => {
    const index = users.findIndex(user => user.socketId === socketId);
    if (index !== -1) {
        users.splice(index, 1);
    }
};

const rooms: Room[] = [];
const roomGames: { [roomId: string]: PokerGame } = {};
let playerRanks: { score: number; card: { suit: string; point: number }; index: number; name: string; rank: number, userInfo: User }[] = [];
const maxCoefficient = 4;
const maxScore = 10;

const createRoom = (name: string, socket: socketio.Socket, betAmount: number): Room => {
    const newRoom: Room = {
        id: generateRoomId(),
        name,
        wallet: 0,
        members: [],
        isPlaying: false,
        owner: '',
        readyPlayer: [],
        medalHolder: '',
        sessionId: '',
        betAmount: betAmount,
        allUserConfirmed: true,
        userConfirmed: []
    };
    rooms.push(newRoom);
    socket.emit('listRoom', rooms);
    return newRoom;
};

const joinRoom = (roomId: string, userInfo: User): boolean => {
    const room = rooms.find(room => room.id === roomId);
    if (!room) return false;

    if (room.isPlaying) {
        console.log(`Phòng ${roomId} đã bắt đầu mất rồi.`);
        return false;
    }

    const user = getUserInfo(userInfo.id);

    if (!user) users.push(userInfo);

    if (!room.members.includes(userInfo.id)) {
        room.members.push(userInfo.id);
        if (!room.owner || room.members.length < 2) {
            room.owner = userInfo.id;
            room.medalHolder = userInfo.id;
        }
        pokerGame._playerName = room.members;
        getMoneyForUser(userInfo);
        return true;
    }
    return false;
};

const handleBetResults = (roomId: string, playerScores: { id: string, score: number }[]) => {
    const room = rooms.find(room => room.id === roomId);
    if (!room) return;

    const medalHolder = getUserInfo(room.medalHolder);
    if (!medalHolder) return;

    const medalHolderRank = playerRanks.find(p => p.userInfo.id === medalHolder.id)?.rank || 0;
    const medalHolderScore = playerRanks.find(p => p.userInfo.id === medalHolder.id)?.score || 0;

    let playerWalletUpdates: { userId: string; wallet: number }[] = [];
    const getAllWallets = (): { userId: string; wallet: number }[] => {
        return users.map(user => ({ userId: user.id, wallet: user.wallet }));
    };

    const allWallets = getAllWallets();
    playerWalletUpdates = allWallets;

    let ownerWinCount = 0;

    const userRewards: { userId: string, amount: number }[] = [];

    playerRanks.forEach(player => {
        if (player.userInfo.id === medalHolder.id) return;

        const playerInfo = getUserInfo(player.userInfo.id);
        if (!playerInfo) return;

        if (!roomGames[room.id]) {
            roomGames[room.id] = new PokerGame();
        }
        const game = roomGames[room.id];

        const playerHasThreeIdenticalCards = game.hasSapCards(game._playerHoleCards[player.index]);
        const medalHolderHasThreeIdenticalCards = game.hasSapCards(game._playerHoleCards.find((_, index) => index === playerRanks.find(p => p.userInfo.id === medalHolder.id)?.index) || []);

        const playerHasDongHoaCards = game.hasDongHoaCards(game._playerHoleCards[player.index]);
        const medalHolderHasDongHoaCards = game.hasDongHoaCards(game._playerHoleCards.find((_, index) => index === playerRanks.find(p => p.userInfo.id === medalHolder.id)?.index) || []);

        const calculateRewardOrPenalty = (condition: boolean, rewardMultiplier: number, penaltyMultiplier: number) => {
            const amount = room.betAmount * (maxCoefficient + (condition ? rewardMultiplier : -penaltyMultiplier));
            userRewards.push({ userId: player.userInfo.id, amount });
            // player.userInfo.wallet += amount;
            amount > 0 ? addMoneyForUser(player.userInfo, amount) : deductMoneyForUser(player.userInfo, amount)
            ownerWinCount += condition ? -rewardMultiplier : penaltyMultiplier;
        };

        if (playerHasDongHoaCards && !medalHolderHasDongHoaCards) {
            calculateRewardOrPenalty(true, 4, 4);
        } else if (!playerHasDongHoaCards && medalHolderHasDongHoaCards) {
            calculateRewardOrPenalty(false, 4, 4);
        } else if (playerHasDongHoaCards && medalHolderHasDongHoaCards) {
            calculateRewardOrPenalty(player.rank < medalHolderRank, 4, 4);
        } else if (playerHasThreeIdenticalCards && !medalHolderHasThreeIdenticalCards) {
            calculateRewardOrPenalty(true, 3, 3);
        } else if (!playerHasThreeIdenticalCards && medalHolderHasThreeIdenticalCards) {
            calculateRewardOrPenalty(false, 3, 3);
        } else if (playerHasThreeIdenticalCards && medalHolderHasThreeIdenticalCards) {
            calculateRewardOrPenalty(player.rank < medalHolderRank, 3, 3);
        } else {
            calculateRewardOrPenalty(player.rank < medalHolderRank, player.score === maxScore ? 2 : 1, medalHolderScore === maxScore ? 2 : 1);
        }
        const existingUpdate = playerWalletUpdates.find(update => update.userId === player.userInfo.id);
        if (existingUpdate) {
            existingUpdate.wallet = playerInfo.wallet;
        } else {
            playerWalletUpdates.push({ userId: player.userInfo.id, wallet: playerInfo.wallet });
        }
    });

    const medalHolderReward = room.betAmount * maxCoefficient * (room.members.length - 1) + (ownerWinCount * room.betAmount);
    userRewards.push({ userId: medalHolder.id, amount: medalHolderReward });
    // medalHolder.wallet += medalHolderReward;
    medalHolderReward > 0 ? addMoneyForUser(medalHolder, medalHolderReward) : deductMoneyForUser(medalHolder, medalHolderReward)
    // getRewardWinnerWithArray(room.sessionId, userRewards);

    // Send updated wallets
    ioToFe.to(room.id).emit('playerWalletUpdated', playerWalletUpdates);

    // Update the medal holder
    const winner = playerScores.sort((a, b) => b.score - a.score)[0];
    if (winner && winner.score >= maxScore && winner.id !== room.medalHolder) {
        room.readyPlayer = room.readyPlayer.filter(player => player !== room.owner);
        room.medalHolder = winner.id;
        room.owner = winner.id;
        ioToFe.to(room.id).emit('updateOwner', { roomOwner: room.owner, roomMembers: room.members });
    }
};

const leaveRoom = (roomId: string, userId: string): boolean => {
    const room = rooms.find(room => room.id === roomId);
    if (room) {
        room.members = room.members.filter(member => member !== userId);
        room.readyPlayer = room.readyPlayer.filter(player => player !== userId);
        if (room.owner === userId && room.members.length > 0) {
            ioToFe.to(room.id).emit('updateOwner', { roomOwner: room.members[0], roomMembers: room.members });
            room.owner = room.members[0];
        }
        if (room.members.length === 0) {
            const roomIndex = rooms.findIndex(r => r.id === roomId);
            if (roomIndex !== -1) {
                rooms.splice(roomIndex, 1);
            }
        } else {
            room.members = room.members.filter(member => member !== userId);
        }
        return true;
    }
    return false;
};

const suitList = ["Diamond", "Heart", "Club", "Spade"];

const pokers = () => {
    let list: { suit: string; point: number }[] = [];
    suitList.forEach(suit => {
        for (let i = 1; i <= 9; i++) {
            list.push({
                suit,
                point: i
            });
        }
    });
    return list;
};

const shuffle = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const getPokers = () => {
    const list = pokers();
    return shuffle(list);
};

class PokerGame {
    private _allPokers: { suit: string, point: number }[] = [];

    constructor() {
        this._initializeDeck();
    }

    private _initializeDeck() {
        this._allPokers = getPokers();
    }

    public _playerHoleCards: { suit: string, point: number }[][] = [];
    public _playerScores: number[] = [];
    public _playerName: string[] = [];

    public takePoker(numPlayer = 1) {
        this._playerHoleCards = [];
        this._allPokers = getPokers();
        for (let i = 0; i < numPlayer; i++) {
            let arr: { suit: string, point: number }[] = [];
            for (let j = 0; j < 3; j++) { // Change 3 to 4 to deal 4 cards per player
                const l = this._allPokers.length;
                const index = Math.floor(Math.random() * l);
                arr.push(this._allPokers[index]);
                this._allPokers.splice(index, 1);
            }
            this._playerHoleCards.push(arr);
        }
        this.checkScoreOfPlayer();
    }

    public _playersNum: number = 5;

    private checkScoreOfPlayer() {
        let score = 0;
        for (let i = 0; i < this._playersNum; i++) {
            const playerCards = this._playerHoleCards[i];
            playerCards.forEach(card => {
                score += card.point;
                score %= 10;
            });
        }
    }

    public getHighestCardOfAllUsers(): { suit: string, point: number }[][] {
        if (this._playerHoleCards.length === 0) return [];

        let highestCards: { suit: string, point: number }[][] = [];

        this._playerHoleCards.forEach(playerCards => {
            let highestCard: { suit: string, point: number }[] = [];
            playerCards.forEach(card => {
                if (highestCard.length === 0 || this.compareCardSuits(card, highestCard[0]) > 0 ||
                    (this.compareCardSuits(card, highestCard[0]) === 0 && this.compareCardPoints(card, highestCard[0]) > 0)) {
                    highestCard = [card];
                } else if (this.compareCardSuits(card, highestCard[0]) === 0 && this.compareCardPoints(card, highestCard[0]) === 0) {
                    highestCard.push(card);
                }
            });
            highestCards.push(highestCard);
        });
        return highestCards;
    }

    public hasDongHoaCards = (cards: { suit: string, point: number }[]): boolean => {
        const sortedCards = cards.slice().sort((a, b) => a.point - b.point);
        for (let i = 0; i < sortedCards.length - 2; i++) {
            if (
                sortedCards[i].suit === sortedCards[i + 1].suit &&
                sortedCards[i].suit === sortedCards[i + 2].suit &&
                sortedCards[i].point + 1 === sortedCards[i + 1].point &&
                sortedCards[i].point + 2 === sortedCards[i + 2].point
            ) {
                return true;
            }
        }
        return false;
    }

    public hasSapCards = (cards: { suit: string, point: number }[]): boolean => {
        const cardPoints = cards.map(card => card.point);
        return cardPoints.some(point => cardPoints.filter(p => p === point).length === 3);
    };

    public determineWinner(): { score: number; card: { suit: string; point: number }; index: number; name: string; rank: number, userInfo: User }[] {
        const players = Array.from({ length: this._playersNum }, (_, i) => {
            let score = this._playerHoleCards[i].reduce((acc, card) => (acc + card.point) % 10, 0);
            if (score === 0) score = maxScore;
            const highestCard = this.getHighestCard(this._playerHoleCards[i]);
            const user = users.find(user => user.username === this._playerName[i]);
            return {
                score,
                card: highestCard,
                index: i,
                name: this._playerName[i],
                userInfo: user!
            };
        });

        players.sort((a, b) => {
            const scoreDiff = b.score - a.score;
            if (scoreDiff !== 0) return scoreDiff;

            if (a.card.suit === b.card.suit) {
                return this.compareCardPoints(b.card, a.card);
            } else {
                return this.compareCardSuits(b.card, a.card);
            }
        });

        return players.map((player, rank) => ({ ...player, rank: rank + 1 }));
    }

    compareCardPoints(card1: { suit: string, point: number }, card2: { suit: string, point: number }) {
        const pointOrder = { 1: 14, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13 };
        if (pointOrder[card1.point as keyof typeof pointOrder] > pointOrder[card2.point as keyof typeof pointOrder]) return 1;
        if (pointOrder[card1.point as keyof typeof pointOrder] < pointOrder[card2.point as keyof typeof pointOrder]) return -1;
        return 0;
    }

    compareCardSuits(card1: { suit: string, point: number }, card2: { suit: string, point: number }) {
        const suitOrder = { 'Diamond': 4, 'Heart': 3, 'Club': 2, 'Spade': 1 };
        if (suitOrder[card1.suit as keyof typeof suitOrder] > suitOrder[card2.suit as keyof typeof suitOrder]) return 1;
        if (suitOrder[card1.suit as keyof typeof suitOrder] < suitOrder[card2.suit as keyof typeof suitOrder]) return -1;
        return 0;
    }

    getHighestCard(cards: { suit: string, point: number }[]) {
        const sortedCards = cards.slice().sort((a: { suit: string, point: number }, b: { suit: string, point: number }) => {
            const suitComparison = this.compareCardSuits(b, a);
            if (suitComparison !== 0) return suitComparison;
            return this.compareCardPoints(b, a);
        });
        return sortedCards[0];
    }
}

const pokerGame = new PokerGame();

export const getRoomMembers = (roomId: string): string[] | undefined => {
    const room = rooms.find(room => room.id === roomId);
    return room ? room.members : undefined;
};

const checkMemberBeforeStartGame = (roomId: string): boolean => {
    const room = rooms.find(room => room.id === roomId);
    return room ? room.members.length > 1 : false;
};

const generateRoomId = (): string => {
    let roomId: string;
    do {
        roomId = uuidv4().replace(/-/g, '').substring(0, 10);
    } while (rooms.some(room => room.id === roomId));
    return roomId;
};

const getRewardFromBot = (userId: string): number => {
    const user = getUserInfo(userId);
    return user ? user.wallet : 0;
};


const generateSessionId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

dotenv.config();

const REWARD_URL = process.env.REWARD_URL || 'http://10.10.20.15:3000/payoutApplication';
const API_KEY = process.env.API_KEY || 'cb4244a56231a022c00539cd03aa6';
const APP_ID = process.env.APP_ID || '1892383759127771740';
const BOT_ID = process.env.BOT_ID || '1840651530236071936';

const getRewardWinnerWithArray = async (currentGameId: string, userRewards: { userId: string, amount: number }[]) => {
    console.log('Rewarding winners:', currentGameId, userRewards);
    try {
        const response = await axios.post(REWARD_URL, {
            sessionId: currentGameId,
            userRewardedList: userRewards
        }, {
            headers: {
                'apiKey': API_KEY,
                'appId': APP_ID,
                'Content-Type': 'application/json'
            }
        });
        console.log('Reward response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error rewarding winners:', error);
    }
};

const getRewardWinner = async (currentGameId: string, userId: string, amount: number) => {
    console.log('Rewarding winner:', currentGameId, userId, amount);
    try {
        const response = await axios.post(REWARD_URL, {
            sessionId: currentGameId,
            userRewardedList: [{ 'userId': userId, 'amount': amount }]
        }, {
            headers: {
                'apiKey': API_KEY,
                'appId': APP_ID,
                'Content-Type': 'application/json'
            }
        });
        console.log('Reward response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error rewarding winners:', error);
        throw error;
    }
};

ioToFe.on('connection', (socket) => {
    if (socket && socket.id) {
        console.log(`Client connected: ${socket.id}`);
    } else {
        console.log('Client connected, but socket.id is undefined');
    }
    rooms.forEach(room => {
        if (room.members.length === 0) {
            const roomIndex = rooms.findIndex(r => r.id === room.id);
            if (roomIndex !== -1) {
                rooms.splice(roomIndex, 1);
            }
        }
    });
    ioToFe.emit('listRoom', rooms);

    socket.on('disconnect', () => {
        const user = getUserBySocketId(socket.id);
        if (user) {
            rooms.forEach(room => {
                if (room.members.includes(user.id)) {
                    leaveRoom(room.id, user.id);
                    socket.leave(room.id);
                    ioToFe.to(room.id).emit('roomLeft', { message: `User "${user.username}" left the room`, roomMembers: getRoomMembers(room.id) });
                }
            });
        }
        disconnectUser(socket.id);
    });

    socket.on('leaveRoom', (data) => {
        const room = rooms.find(room => room.id === data.id);
        if (room && room.isPlaying) {
            socket.emit('status', { message: `Phòng ${room.id} đã bắt đầu mất rồi.` });
            return;
        }
        if (leaveRoom(data.id, data.userId)) {
            ioToFe.to(data.id).emit('roomLeft', { message: `Rời phòng "${data.id}" thành công`, roomMembers: getRoomMembers(data.id) });
            socket.leave(data.id);
        } else {
            ioToFe.to(data.id).emit('roomLeft', { message: `Không tìm thấy phòng "${data.id}"`, roomMembers: getRoomMembers(data.id) });
        }
        rooms.forEach(room => {
            if (room.members.length === 0) {
                const roomIndex = rooms.findIndex(r => r.id === room.id);
                if (roomIndex !== -1) {
                    rooms.splice(roomIndex, 1);
                }
            } else if (room.owner === data.userId) {
                console.log('Owner left the room:', room.id);
                room.owner = room.members[0];
                ioToFe.to(room.id).emit('playerReady', { owner: room.owner, readyPlayer: room.readyPlayer });
            }
        });
        console.log('Rooms index:', rooms);
        ioToFe.emit('listRoom', rooms);
    });

    socket.on('agreeGame', (data) => {
        const room = rooms.find(room => room.id === data.roomId);
        if (room) {
            if (!room.readyPlayer.includes(data.userId) && data.agree) {

                room.readyPlayer.push(data.userId);
            } else {
                room.readyPlayer = room.readyPlayer.filter(id => id !== data.userId);
            }

            if (!room.readyPlayer.includes(room.owner)) room.readyPlayer.push(room.owner);
            console.log('Player ready 4:', data.userId, room.readyPlayer);
            ioToFe.to(data.roomId).emit('playerReady', { owner: room.owner, readyPlayer: room.readyPlayer });
        } else {
            console.log(`Room ${data.roomId} not found`);
        }
    });

    socket.on('endGame', (data) => {
        const room = rooms.find(room => room.id === data.roomId);
        if (room) {
            room.isPlaying = false;
            const medalHolder = getUserInfo(room.medalHolder);
            console.log('End game:', room.id, data.userId, medalHolder?.id);
            if (medalHolder?.id == data.userId) {
                handleBetResults(data.roomId, playerRanks.map(player => ({ id: player.userInfo.id, score: player.score, rank: player.rank })));
            }
        }
    });

    socket.on("userInfo", (userInfo) => {
        const user = users.find((user) => user.id === userInfo.id);
        if (user && user.id == userInfo.id) {
            console.log(`User updated: ${JSON.stringify(user)}`);
            disconnectUser(socket.id);
            addUser(userInfo.id, userInfo.username, userInfo.displayName, userInfo.wallet, userInfo.avatarUrl, userInfo.email, socket.id);
        } else {
            console.log(`User added: ${JSON.stringify(userInfo)}`);
            addUser(userInfo.id, userInfo.username, userInfo.displayName, userInfo.wallet, userInfo.avatarUrl, userInfo.email, socket.id);
        }
    });

    socket.on('listRoom', () => {
        rooms.forEach(room => {
            if (room.members.length === 0) {
                const roomIndex = rooms.findIndex(r => r.id === room.id);
                if (roomIndex !== -1) {
                    rooms.splice(roomIndex, 1);
                }
            }
        });
        socket.emit('listRoom', rooms);
    });

    socket.on('createRoom', (data) => {
        const room = createRoom(data.name, socket, data.betAmount);
        socket.emit('roomCreated', room.id);
        ioToFe.emit('listRoom', rooms);
    });

    socket.on('joinRoom', (data) => {
        const room = rooms.find(room => room.id === data.roomId);
        if (!room) {
            socket.emit('status', { message: `Không tìm thấy phòng ${data.roomId}` });
            return;
        }

        if (room.isPlaying) {
            socket.emit('status', { message: 'Phòng đã bắt đầu r' });
            return;
        }

        const user = getUserInfo(data.userInfo.id);
        const insufficientFunds = user ? user.wallet < room.betAmount : true;

        if (insufficientFunds) {
            ioToFe.to(socket.id).emit('status', { message: 'Bạn chưa đủ GOLD để tham gia rồi!' });
            return false;
        }
    
        const roomJoined = joinRoom(data.roomId, data.userInfo);
        const roomMembers = getRoomMembers(data.roomId)?.map((userId: string) => {
            const user = getUserInfo(userId);
            return user ? {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                wallet: user.wallet,
                email: user.email
            } : null;
        }).filter((member) => member !== null) || [];

        socket.join(data.roomId);

        if (room && !room.readyPlayer.includes(room.owner)) {
            room.readyPlayer.push(room.owner);
        }
        console.log(`User ${data.userInfo.username} joined room ${data.roomId}`);

        ioToFe.to(data.roomId).emit('roomJoined', {
            message: roomJoined ? `Tham gia phòng "${data.roomId}" thành công` : `Không tìm thấy phòng "${data.roomId}"`,
            roomId: data.roomId,
            roomMembers,
            owner: room?.owner,
        });
    });

    socket.on('userCancelBet', (data) => {
        console.log('User canceled bet:', data);
        const room = rooms.find(room => room.id === data.roomId);
        if (room) room.allUserConfirmed = false;
    });

    socket.on('userConfirmBet', (data) => {
        console.log('User confirmed bet:', data);
        const room = rooms.find(room => room.id === data.roomId);
        if (room) room.userConfirmed.push(data.userId);
    });

    socket.on('getBalance', (data) => {
        handleGetBalance(data.userInfo.id);
    });


    socket.on('startGame', (data) => {
        const room = rooms.find(room => room.id === data.roomId);
        if (!room) {
            ioToFe.to(socket.id).emit('status', { message: 'Không tìm thấy phòng' });
            return;
        }

        if (room.members.length == 1) {
            ioToFe.to(room.id).emit('status', { message: 'Phòng chưa có đủ người chơi' });
            return;
        }

        if (room.readyPlayer.length !== room.members.length) {
            ioToFe.to(room.id).emit('status', { message: 'Tất cả mọi người cần phải cùng sẵn sàng', });
            return;
        }

        const owner = getUserInfo(room.owner);
        console.log('getUserInfo ' + owner?.displayName + ' ' + owner?.wallet + ' ' + (room.betAmount * maxCoefficient * (room.members.length - 1)))
        if (!owner || owner.wallet < room.betAmount * maxCoefficient * (room.members.length - 1)) {
            ioToFe.to(room.id).emit('status', { message: 'Chủ phòng không có đủ GOLD để bắt đầu!' });
            return;
        }

        // const insufficientFunds = room.members?.some(memberId => {
        //     const user = getUserInfo(memberId);
        //     return user ? user.wallet < (room.betAmount * maxCoefficient) : true;
        // });

        // if (insufficientFunds) {
        //     ioToFe.to(room.id).emit('status', { message: 'Some members do not have enough tokens' });
        //     return;
        // }

        if (!roomGames[data.roomId]) {
            roomGames[data.roomId] = new PokerGame();
        }

        room.allUserConfirmed = true;
        room.userConfirmed = [];
        room.sessionId = generateSessionId();

        // const roomMembers = getRoomMembers(data.roomId);
        // roomMembers?.forEach(memberId => {
        //     const user = getUserInfo(memberId);
        //     if (user) {
        //         if (user.id !== room.medalHolder) {
        //             io.to(user.socketId).emit("startBet", {
        //                 gameId: room.id,
        //                 totalBet: room.betAmount * maxCoefficient,
        //                 receiverId: BOT_ID,
        //                 appId: APP_ID,
        //                 currentGameId: room.sessionId,
        //             });
        //             user.wallet -= room.betAmount * maxCoefficient;
        //             deductMoneyForUser(user, room.betAmount * maxCoefficient);
        //         } else {
        //             io.to(user.socketId).emit("startBet", {
        //                 gameId: room.id,
        //                 totalBet: room.betAmount * maxCoefficient * (room.members.length - 1),
        //                 receiverId: BOT_ID,
        //                 appId: APP_ID,
        //                 currentGameId: room.sessionId,
        //             });
        //             user.wallet -= room.betAmount * maxCoefficient * (room.members.length - 1);
        //             deductMoneyForUser(user, room.betAmount * maxCoefficient * (room.members.length - 1));
        //         }
        //     }
        // });

        // setTimeout(() => {
        //     const room = rooms.find(room => room.id === data.roomId);
        //     if (!room) return;
        //     console.log('All users confirmed:', room.allUserConfirmed);
        //     if (room.allUserConfirmed || room.userConfirmed.length === room.members.length) {
        //         dealCards(data.roomId);
        //     } else {
        //         io.to(room?.id).emit('userConfirmed', { message: 'Not all users confirmed' });
        //         const userRewards: { userId: string, amount: number }[] = [];
        //         for (let i = 0; i < room.userConfirmed.length; i++) {
        //             const user = getUserInfo(room.userConfirmed[i]);
        //             if (user) {
        //                 userRewards.push({ userId: user.id, amount: room.betAmount * maxCoefficient });
        //                 user.wallet += room.betAmount * maxCoefficient;
        //                 addMoneyForUser(user, room.betAmount * maxCoefficient);
        //             }
        //         }
        //         getRewardWinnerWithArray(room.sessionId, userRewards);
        //     }
        // }, 10000);
        dealCards(data.roomId);
    });


});
server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
});