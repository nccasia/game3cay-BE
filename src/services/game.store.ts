import { PokerGame } from './poker.service';

export const roomGames: Record<string, PokerGame> = {};
export let playerRanks: any[] = [];

export const resetPlayerRanks = () => {
  playerRanks = [];
};