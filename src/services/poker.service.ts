import { getPokers } from '../utils/deck';
import { User } from '../models/user.model';

export type CardSuit = 'Diamond' | 'Heart' | 'Club' | 'Spade';

export interface Card {
  suit: CardSuit;
  point: number;
}

export class PokerGame {
  private _allPokers: Card[] = getPokers();
  public _playerHoleCards: Card[][] = [];
  public _playersNum = 5;
  public _playerName: string[] = [];

  public takePoker(numPlayer = 1) {
    this._playerHoleCards = [];
    this._allPokers = getPokers();
    for (let i = 0; i < numPlayer; i++) {
      const cards: Card[] = [];
      for (let j = 0; j < 3; j++) {
        const index = Math.floor(Math.random() * this._allPokers.length);
        cards.push(this._allPokers[index]);
        this._allPokers.splice(index, 1);
      }
      this._playerHoleCards.push(cards);
    }
  }

  public determineWinner(users: User[]): {
    score: number;
    card: Card;
    index: number;
    name: string;
    rank: number;
    userInfo: User;
  }[] {
    const results = this._playerHoleCards.map((cards, i) => {
      const score = cards.reduce((acc, c) => (acc + c.point) % 10, 0) || 10;
      const user = users.find(u => u.username === this._playerName[i])!;
      return {
        score,
        card: this.getHighestCard(cards),
        index: i,
        name: this._playerName[i],
        userInfo: user,
      };
    });

    const suitOrder: Record<CardSuit, number> = {
      Diamond: 4,
      Heart: 3,
      Club: 2,
      Spade: 1,
    };

    results.sort((a, b) => {
      const diff = b.score - a.score;
      if (diff !== 0) return diff;
      const suitDiff = suitOrder[b.card.suit] - suitOrder[a.card.suit];
      if (suitDiff !== 0) return suitDiff;
      return b.card.point - a.card.point;
    });

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  private getHighestCard(cards: Card[]): Card {
    const suitOrder: Record<CardSuit, number> = {
      Diamond: 4,
      Heart: 3,
      Club: 2,
      Spade: 1,
    };

    return cards.sort((a, b) => {
      if (suitOrder[b.suit] !== suitOrder[a.suit]) {
        return suitOrder[b.suit] - suitOrder[a.suit];
      }
      return b.point - a.point;
    })[0];
  }
}