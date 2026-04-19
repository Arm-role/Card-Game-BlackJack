import { Card, Suit, Rank } from '../shared/types';

export interface IDeck {
  draw(): Card;
}

export class Deck implements IDeck {
  private cards: Card[] = [];

  constructor() {
    this.initialize();
    this.shuffle();
  }

  private initialize() {
    const suits: Suit[] = ['♣', '♦', '♥', '♠'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push({ suit, rank });
      }
    }
  }

  private shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public draw(): Card {
    if (this.cards.length === 0) {
      throw new Error("Deck is empty");
    }
    return this.cards.pop()!;
  }
}