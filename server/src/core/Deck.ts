import { Card, Rank, Suit } from "../shared/types.js";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IDeck {
  draw(): Card;
}

// ─── Standard shuffled deck ───────────────────────────────────────────────────

const SUITS: Suit[] = ["♣", "♦", "♥", "♠"];
const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

export class Deck implements IDeck {
  private cards: Card[];
  private index = 0;

  constructor() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ suit, rank });
      }
    }
    this.shuffle();
  }

  private shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  public draw(): Card {
    if (this.index >= this.cards.length) {
      // Reshuffle when exhausted
      this.index = 0;
      this.shuffle();
    }
    return this.cards[this.index++];
  }
}