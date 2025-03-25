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
      let arr: Card[] = [];
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