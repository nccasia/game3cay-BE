import express, { Express, Request, Response } from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import dotenv from 'dotenv';

const port: number = parseInt(process.env.PORT || '3200', 10);

const app: Express = express();
const server: http.Server = http.createServer(app);
const io: socketio.Server = new socketio.Server();
io.attach(server, {
    cors: {
        origin: `http://localhost:${port}`,
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header", "Access-Control-Allow-Origin"],
        credentials: true
    }
});

app.get('/hello', async (_: Request, res: Response) => {
    res.send('Hello World')
});

interface User {
    id: string;
    username: string;
    displayName: string;
    wallet: number;
    avatarUrl: string;
    email: string;
    socketId: string;
}

const users: User[] = [];

const addUser = (id: string, username: string, displayName: string, wallet: number, avatarUrl: string, email: string, socketId: string) => {
    const user: User = { id, username, displayName, wallet, socketId, avatarUrl, email };
    users.push(user);
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

interface Room {
    id: string;
    name: string;
    wallet: number;
    members: string[];
    isPlaying: boolean;
    owner: string;
    readyPlayer: string[];
}

const rooms: Room[] = [];
const roomGames: { [roomId: string]: PokerGame } = {};

const createRoom = (name: string, socket: socketio.Socket): Room => {
    const newRoom: Room = {
        id: generateRoomId(),
        name,
        wallet: 0,
        members: [],
        isPlaying: false,
        owner: '',
        readyPlayer: []
    };
    rooms.push(newRoom);
    socket.emit('listRoom', rooms);
    console.log('Rooms:', rooms);
    return newRoom;
};

const checkBeforeJoinRoom = (roomId: string): boolean => {
    return rooms.some(room => room.id === roomId);
};

const joinRoom = (roomId: string, userInfo: User): boolean => {
    const room = rooms.find(room => room.id === roomId);
    if (!room) return false;

    if (room.isPlaying) {
        console.log(`Room ${roomId} is already in a game.`);
        return false;
    }

    const user = getUserInfo(userInfo.id);
    if (!user) users.push(userInfo);

    if (!room.members.includes(userInfo.id)) {
        room.members.push(userInfo.id);
        if (!room.owner || room.members.length < 2) room.owner = userInfo.id;
        pokerGame._playerName = room.members;
        return true;
    }
    return false;
};


const leaveRoom = (roomId: string, userId: string): boolean => {
    const room = rooms.find(room => room.id === roomId);
    if (room) {
        room.members = room.members.filter(member => member !== userId);
        if (room.owner === userId && room.members.length > 0) room.owner = room.members[0];
        if (room.members.length === 0) {
            const roomIndex = rooms.findIndex(r => r.id === roomId);
            if (roomIndex !== -1) {
                rooms.splice(roomIndex, 1);
            }
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
    public winner: { score: number; cards: { suit: string; point: number }[]; index: number; name: string } | null = null;

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


    public determineWinner(): { score: number; card: { suit: string; point: number }; index: number; name: string; rank: number }[] {
        const players = Array.from({ length: this._playersNum }, (_, i) => {
            let score = this._playerHoleCards[i].reduce((acc, card) => (acc + card.point) % 10, 0);
            if (score === 0) score = 10;
            const highestCard = this.getHighestCard(this._playerHoleCards[i]);
            return {
                score,
                card: highestCard,
                index: i,
                name: this._playerName[i]
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

const getCurrentRoom = (userId: string): Room | undefined => {
    return rooms.find(room => room.members.includes(userId));
};

const getRoomOfUser = (userId: string): Room | undefined => {
    return rooms.find(room => room.members.includes(userId));
};

const getRoomMembers = (roomId: string): string[] | undefined => {
    const room = rooms.find(room => room.id === roomId);
    return room ? room.members : undefined;
};

const checkMemberBeforeStartGame = (roomId: string): boolean => {
    const room = rooms.find(room => room.id === roomId);
    return room ? room.members.length > 1 : false;
};

const generateRoomId = (): string => {
    return Math.random().toString(36).substring(2, 11);
};

const startBet = (roomId: string, betAmount: number): boolean => {
    return true;
};

const endBet = (roomId: string): boolean => {
    return true;
};

const getGameMemberStatus = (roomId: string, userId: string): string => {
    return 'active';
};

const getGameOfMember = (roomId: string, userId: string): string => {
    return 'gameId';
};

const getRewardFromBot = (userId: string): number => {
    const user = getUserInfo(userId);
    return user ? user.wallet : 0;
};

const endGame = (roomId: string) => {
    const room = rooms.find(room => room.id === roomId);
    if (room) {
        room.isPlaying = false;
    }
};


dotenv.config();

const REWARD_URL = process.env.REWARD_URL || 'http://10.10.20.15:3000/payoutApplication';
const API_KEY = process.env.API_KEY || '93666ec9ceb82272dd968da427faa';
const APP_ID = process.env.APP_ID || '1897617078817241570';
const BOT_ID = process.env.BOT_ID || '1840651530236071936';

const getRewardWinner = async (currentGameId: string, winner: string, amount: number) => {
    const headers = {
        apiKey: API_KEY,
        appId: APP_ID,
        "Content-Type": "application/json",
    };

    const data = {
        sessionId: currentGameId,
        userRewardedList: [{ userId: winner, amount }],
    };
    console.log("Data:", data);
    try {
        const response = await fetch(REWARD_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data),
        });
        console.log("Response:", response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Result:", result);
        return {
            isSuccess: true,
            message: "Success",
            data: result,
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            isSuccess: false,
            message: "Error",
            data: null,
        };
    }
};

io.on('connection', (socket) => {
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
    socket.emit('listRoom', rooms);

    socket.on('disconnect', () => {
        console.log('client disconnected');
        disconnectUser(socket.id);
        const user = getUserBySocketId(socket.id);
        if (user) {
            rooms.forEach(room => {
                if (room.members.includes(user.id)) {
                    leaveRoom(room.id, user.id);
                    io.to(room.id).emit('roomLeft', { message: `User "${user.username}" left the room`, roomMembers: getRoomMembers(room.id) });
                }
            });
        }
    });

    socket.on('leaveRoom', (data) => {
        const room = rooms.find(room => room.id === data.id);
        if(room && room.isPlaying){
            socket.emit('status', { message: 'Game already in progress' });
            return;
        }
        if (leaveRoom(data.id, data.userId)) {
            io.to(data.id).emit('roomLeft', { message: `Room "${data.id}" left successfully`, roomMembers: getRoomMembers(data.id) });
        } else {
            io.to(data.id).emit('roomLeft', { message: `Room "${data.id}" not found`, roomMembers: getRoomMembers(data.id) });
        }
        rooms.forEach(room => {
            if (room.members.length === 0) {
                const roomIndex = rooms.findIndex(r => r.id === room.id);
                if (roomIndex !== -1) {
                    rooms.splice(roomIndex, 1);
                }
            } else if (room.owner === data.userId) {
                room.owner = room.members[0];
                io.to(room.id).emit('playerReady', { owner: room.owner, readyPlayer: room.readyPlayer });
            }
        });
        socket.emit('listRoom', rooms);
    });

    socket.on('agreeGame', (data) => {
        const room = rooms.find(room => room.id === data.roomId);
        console.log('agreeGame', data);
        if (room) {
            if (!room.readyPlayer.includes(data.userId) && data.agree) {
                room.readyPlayer.push(data.userId);
            } else {
                room.readyPlayer = room.readyPlayer.filter(id => id !== data.userId);
            }
            console.log(`Player ${data.userId} ${data.agree ? 'agreed' : 'disagreed'} to start the game in room ${data.roomId}`);
            console.log('Current ready players:', room.readyPlayer);
            io.to(data.roomId).emit('playerReady', { owner: room.owner, readyPlayer: room.readyPlayer });
        } else {
            console.log(`Room ${data.roomId} not found`);
        }
    });

    socket.on('endGame', (data) => {
        const room = rooms.find(room => room.id === data.roomId);
        if (room) room.isPlaying = false;
    });

    socket.on("userInfo", (userInfo) => {
        const user = users.find((user) => user.id === userInfo.id);
        if (user && user.id == userInfo.id) {
            console.log(`User updated: ${JSON.stringify(user)}`);
        } else {
            addUser(userInfo.id, userInfo.username, userInfo.displayName, userInfo.wallet, userInfo.avatarUrl, userInfo.email, socket.id);
            console.log(`User added: ${JSON.stringify(userInfo)}`);
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
        const room = createRoom(data.name, socket);
        socket.emit('roomCreated', room.id);
        io.emit('listRoom', rooms);
    });

    socket.on('createGame', (data) => {
        console.log('createGame', data);
    });

    socket.on('joinRoom', (data) => {
        console.log('joinRoom', data);

        const room = rooms.find(room => room.id === data.roomId);
        if (!room) {
            socket.emit('status', { message: 'Room not found' });
            return;
        }

        if (room.isPlaying) {
            socket.emit('status', { message: 'Game already in progress' });
            return;
        }

        const roomJoined = joinRoom(data.roomId, data.userInfo);
        console.log('Room Joined:', roomJoined);
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

        io.to(data.roomId).emit('roomJoined', {
            message: roomJoined ? `Room "${data.roomId}" joined successfully` : `Room "${data.roomId}" not found`,
            roomId: data.roomId,
            roomMembers,
            owner: room?.owner,
        });
    });

    socket.on('startGame', (data) => {
        console.log('startGame', data);

        const room = rooms.find(room => room.id === data.roomId);
        if (!room) {
            socket.emit('status', { message: 'Room not found' });
            return;
        }

        if (room.members.length == 1) {
            socket.emit('status', { message: 'Not enough players' });
            return;
        }

        if (room.readyPlayer.length !== room.members.length) {
            socket.emit('status', { message: 'Not all players are ready' });
            return;
        }

        if (!roomGames[data.roomId]) {
            roomGames[data.roomId] = new PokerGame();
        }

        const game = roomGames[data.roomId];
        const roomMembers = getRoomMembers(data.roomId);
        game._playersNum = roomMembers ? roomMembers.length : 1;
        game._playerName = getRoomMembersName(data.roomId);
        game.takePoker(game._playersNum);

        const playerHoleCards = game._playerHoleCards;
        const playerRanks = game.determineWinner();
        const roomMemberTokens = roomMembers?.map(memberId => {
            const user = getUserInfo(memberId);
            return user ? { id: user.id, token: getRewardFromBot(user.id) } : null;
        }).filter(member => member !== null) || [];

        const allMembersHaveEnoughTokens = roomMemberTokens.every(member => member && member.token > 1000);

        if (allMembersHaveEnoughTokens) {
            if (room) room.isPlaying = true;
            io.to(data.roomId).emit('startedGame', {
                playerHoleCards,
                playerRanks,
            });

            io.to(data.roomId).emit("startBet", {
                gameId: data.roomId,
                totalBet: 1000,
                receiverId: BOT_ID,
                appId: APP_ID,
                currentGameId: data.roomId,
            });

            io.to(data.roomId).emit('playerWallet', game._playerName.map((name, index) => {
                const user = users.find(user => user.username === name);
                if (user) {
                    console.log('User wallet:', getRewardFromBot(user.id));
                }
                return user ? { userID: user.id, newWalletAmount: getRewardFromBot(user.id)} : null;
            }).filter(data => data !== null));

            const winner = playerRanks[0];
            getRewardWinner(data.roomId, winner.name, 1000 * game._playersNum)
                .then(response => {
                    console.log('Reward response:', response);
                    io.to(data.roomId).emit('winnerRewarded', { message: 'Winner has been rewarded', winner });
                })
                .catch(error => {
                    console.error('Failed to reward winner:', error);
                    socket.emit('status', { message: 'Failed to reward winner' });
                });

        } else {
            socket.emit('status', { message: 'Some members do not have enough tokens' });
        }
    });

});
server.listen(port, () => {
    console.log('> Ready on http://localhost:${port}');
});