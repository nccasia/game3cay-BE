import { io } from "socket.io-client";
import { IOReturn } from "../models/io.model";
// import { eventBus } from "../src/globalEvent";
require('dotenv').config();

export class IOInteract {
    private static _instance: IOInteract = new IOInteract();
    public static get instance(): IOInteract {
        return this._instance
    }
    // socket = io("http://10.10.41.239:3001"); local
    socket = io("https://socketgameuser-server.nccsoft.vn", { secure: true, transports: ['websocket'] });
    hash = process.env.REACT_APP_HASH

    connect() {
        console.log(this.hash)
        // console.log(socket);
        this.socket.on("connect_error", (error) => {
            if (this.socket.active) {
                // temporary failure, the socket will automatically try to reconnect
            } else {
                // the connection was denied by the server
                // in that case, `socket.connect()` must be manually called in order to reconnect
                console.log(error.message);
            }
        });
        this.socket.on("connect", () => {
            console.log('connectttttt', this.socket.id);
        });
        this.socket.on("disconnect", () => {
            console.log('connectttttt', this.socket.id);
        });
        // this.socket.on("balance", (data) => {
        //     console.log('balance', data.userId, data.balance);
        //     eventBus.emit("responseBalance", { userId: data.userId, balance: data.balance })
        // });
    }

    addBalance(user: string, value: number, onSuccess: (response: IOReturn) => void) {
        this.socket.emit('addBalance', { user: user, value: value, hash: this.hash }, (callbackData: any) => {
            onSuccess(callbackData)
        })
    }
    deductBalance(user: string, value: number, onSuccess: (response: IOReturn) => void) {
        this.socket.emit('deductBalance', { user: user, value: value, hash: this.hash }, (callbackData: any) => {
            onSuccess(callbackData)
        })
    }
    getBalance(user: string, onSuccess: (response: IOReturn) => void) {
        console.log(`getBalance:${user} ${this.hash}`);
        this.socket.emit('getBalance', { user: user, hash: this.hash }, (callbackData: any) => {
            onSuccess(callbackData)
        })
    }
    swapToken(user: string, value: number, onSuccess: (response: IOReturn) => void) {
        console.log(`swaptoken:${user} ${value}`);
        // this.socket.emit('swapToken', { user: user, value: value, hash: this.hash }, (callbackData: IOReturn) => {
        //     onSuccess(callbackData)
        // })
    }
}

