import { Card, GameResult, GameState, PlayerStatus, Rank } from "../types.js";
import { Deck, IDeck } from "./deck.js";

export class Hand {
  public cards: Card[] = [];

  public addCard(card: Card) {
    this.cards.push(card);
  }

  public getScore(): number {
    let total = 0;
    let aces = 0;

    for (const card of this.cards) {
      if ([Rank.JACK, Rank.QUEEN, Rank.KING].includes(card.rank)) {
        total += 10;
      } else if (card.rank === Rank.ACE) {
        total += 11;
        aces += 1;
      } else {
        total += card.rank + 2; // TWO=0→2, THREE=1→3, …, TEN=8→10
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

export class BlackjackGame {
  private playersHands = new Map<number, Hand>();
  private playerStatuses = new Map<number, PlayerStatus>();
  private playerResults = new Map<number, GameResult>();
  private dealerHand = new Hand();
  private dealerId: number = -1;
  public state: GameState = GameState.WAITING;

  constructor(private deck: IDeck = new Deck()) { }

  public startGame(playerIds: number[], dealerId: number = -1) {
    this.dealerId = dealerId;
    this.state = GameState.PLAYER_TURN;
    this.dealerHand = new Hand();
    this.playersHands.clear();
    this.playerStatuses.clear();
    this.playerResults.clear();

    for (const id of playerIds) {
      this.playersHands.set(id, new Hand());
      this.playerStatuses.set(id, PlayerStatus.PLAYING);
      this.playerResults.set(id, GameResult.PENDING);
    }

    for (let i = 0; i < 2; i++) {
      for (const id of playerIds) {
        this.playersHands.get(id)!.addCard(this.deck.draw());
      }
      this.dealerHand.addCard(this.deck.draw());
    }

    for (const id of playerIds) {
      if (this.playersHands.get(id)!.isBlackjack()) {
        this.playerStatuses.set(id, PlayerStatus.BLACKJACK);
      }
    }
  }

  public hit(playerId: number): Card | undefined {
    if (this.state !== GameState.PLAYER_TURN) return undefined;
    const hand = this.playersHands.get(playerId);
    const status = this.playerStatuses.get(playerId);
    if (!hand || status !== PlayerStatus.PLAYING) return undefined;

    const card = this.deck.draw();
    hand.addCard(card);

    if (hand.isBust()) {
      this.playerStatuses.set(playerId, PlayerStatus.BUST);
    } else if (hand.getScore() === 21) {
      this.playerStatuses.set(playerId, PlayerStatus.STAND);
    }
    return card;
  }

  public stand(playerId: number) {
    if (this.state !== GameState.PLAYER_TURN) return;
    if (this.playerStatuses.get(playerId) === PlayerStatus.PLAYING) {
      this.playerStatuses.set(playerId, PlayerStatus.STAND);
    }
  }

  public playDealerTurn(): void {
    this.state = GameState.DEALER_TURN;
    const hasNonBust = Array.from(this.playerStatuses.values()).some(s => s !== PlayerStatus.BUST);
    if (hasNonBust) {
      while (this.dealerHand.getScore() < 17) {
        this.dealerHand.addCard(this.deck.draw());
      }
    }
    this.state = GameState.RESOLVING;
    this.evaluateWinners();
  }

  private evaluateWinners() {
    const dealerScore = this.dealerHand.getScore();
    const dealerBust = this.dealerHand.isBust();
    const dealerBlackjack = this.dealerHand.isBlackjack();

    for (const [playerId, hand] of this.playersHands) {
      const status = this.playerStatuses.get(playerId)!;
      const score = hand.getScore();

      if (status === PlayerStatus.BUST) { this.playerResults.set(playerId, GameResult.LOSE); continue; }
      if (status === PlayerStatus.BLACKJACK) {
        this.playerResults.set(playerId, dealerBlackjack ? GameResult.DRAW : GameResult.WIN);
        continue;
      }
      if (dealerBust || score > dealerScore) {
        this.playerResults.set(playerId, GameResult.WIN);
      } else if (score < dealerScore) {
        this.playerResults.set(playerId, GameResult.LOSE);
      } else {
        this.playerResults.set(playerId, GameResult.DRAW);
      }
    }
  }

  public getHand(playerId: number) { return this.playersHands.get(playerId); }
  public getDealerHand() { return this.dealerHand; }
  public getDealerId() { return this.dealerId; }
  public getResult(playerId: number) { return this.playerResults.get(playerId); }
  public getStatus(playerId: number) { return this.playerStatuses.get(playerId); }
  public isResolved(): boolean { return this.state === GameState.RESOLVING; }
  public areAllPlayersDone(): boolean {
    return Array.from(this.playerStatuses.values()).every(s => s !== PlayerStatus.PLAYING);
  }
}
