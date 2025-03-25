import { Card, CardSuit } from '../services/poker.service';

export const suitList: CardSuit[] = ['Diamond', 'Heart', 'Club', 'Spade'];

export const getPokers = (): Card[] => {
  let list: Card[] = [];
  suitList.forEach(suit => {
    for (let i = 1; i <= 9; i++) {
      list.push({ suit, point: i });
    }
  });
  return shuffle(list);
};

export const shuffle = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
