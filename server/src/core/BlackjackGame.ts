import { Card, GameResult, GameState, PlayerStatus } from "../shared/types.js";
import { IDeck, Deck } from "./Deck.js";

// ─── Hand ─────────────────────────────────────────────────────────────────────

export class Hand {
  public cards: Card[] = [];

  public addCard(card: Card) {
    this.cards.push(card);
  }

  public getScore(): number {
    let total = 0;
    let aces = 0;

    for (const card of this.cards) {
      if (["J", "Q", "K"].includes(card.rank)) {
        total += 10;
      } else if (card.rank === "A") {
        total += 11;
        aces += 1;
      } else {
        total += parseInt(card.rank, 10);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return total;
  }

  public isBust(): boolean { return this.getScore() > 21; }
  public isBlackjack(): boolean { return this.cards.length === 2 && this.getScore() === 21; }
}

// ─── BlackjackGame ────────────────────────────────────────────────────────────

export class BlackjackGame {
  private playersHands = new Map<number, Hand>();
  private playerStatuses = new Map<number, PlayerStatus>();
  private playerResults = new Map<number, GameResult>();
  private dealerHand = new Hand();
  public state: GameState = "WAITING";

  constructor(private deck: IDeck = new Deck()) { }

  // ─── Setup ──────────────────────────────────────────────────────────────────

  public startGame(playerIds: number[]) {
    this.state = "PLAYER_TURN";
    this.dealerHand = new Hand();
    this.playersHands.clear();
    this.playerStatuses.clear();
    this.playerResults.clear();

    for (const id of playerIds) {
      this.playersHands.set(id, new Hand());
      this.playerStatuses.set(id, "PLAYING");
      this.playerResults.set(id, "PENDING");
    }

    // Deal 2 cards each
    for (let i = 0; i < 2; i++) {
      for (const id of playerIds) {
        this.playersHands.get(id)!.addCard(this.deck.draw());
      }
      this.dealerHand.addCard(this.deck.draw());
    }

    // Check immediate blackjack
    for (const id of playerIds) {
      if (this.playersHands.get(id)!.isBlackjack()) {
        this.playerStatuses.set(id, "BLACKJACK");
      }
    }
  }

  // ─── Player actions ──────────────────────────────────────────────────────────

  public hit(playerId: number): Card | undefined {
    if (this.state !== "PLAYER_TURN") return undefined;
    const hand = this.playersHands.get(playerId);
    const status = this.playerStatuses.get(playerId);
    if (!hand || status !== "PLAYING") return undefined;

    const card = this.deck.draw();
    hand.addCard(card);

    if (hand.isBust()) {
      this.playerStatuses.set(playerId, "BUST");
    }
    return card;
  }

  public stand(playerId: number) {
    if (this.state !== "PLAYER_TURN") return;
    if (this.playerStatuses.get(playerId) === "PLAYING") {
      this.playerStatuses.set(playerId, "STAND");
    }
  }

  // ─── Dealer turn (called by GameSession) ─────────────────────────────────────

  public playDealerTurn(): void {
    this.state = "DEALER_TURN";

    // Only draw if at least one player is not bust
    const hasNonBust = Array.from(this.playerStatuses.values()).some(s => s !== "BUST");
    if (hasNonBust) {
      while (this.dealerHand.getScore() < 17) {
        this.dealerHand.addCard(this.deck.draw());
      }
    }

    this.state = "RESOLVING";
    this.evaluateWinners();
  }

  private evaluateWinners() {
    const dealerScore = this.dealerHand.getScore();
    const dealerBust = this.dealerHand.isBust();
    const dealerBlackjack = this.dealerHand.isBlackjack();

    for (const [playerId, hand] of this.playersHands) {
      const status = this.playerStatuses.get(playerId)!;
      const score = hand.getScore();

      if (status === "BUST") {
        this.playerResults.set(playerId, "LOSE");
        continue;
      }
      if (status === "BLACKJACK") {
        this.playerResults.set(playerId, dealerBlackjack ? "DRAW" : "WIN");
        continue;
      }
      if (dealerBust || score > dealerScore) {
        this.playerResults.set(playerId, "WIN");
      } else if (score < dealerScore) {
        this.playerResults.set(playerId, "LOSE");
      } else {
        this.playerResults.set(playerId, "DRAW");
      }
    }
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  public getHand(playerId: number) { return this.playersHands.get(playerId); }
  public getDealerHand() { return this.dealerHand; }
  public getResult(playerId: number) { return this.playerResults.get(playerId); }
  public getStatus(playerId: number) { return this.playerStatuses.get(playerId); }

  public isResolved(): boolean {
    return this.state === "RESOLVING";
  }

  public areAllPlayersDone(): boolean {
    return Array.from(this.playerStatuses.values()).every(s => s !== "PLAYING");
  }
}