import { Card, PlayerStatus, GameResult, GameState } from '../shared/types';
import { IDeck } from './Deck';

export class Hand {
  public cards: Card[] = [];

  public addCard(card: Card) {
    this.cards.push(card);
  }

  public getScore(): number {
    let total = 0;
    let aces = 0;

    for (const card of this.cards) {
      if (['J', 'Q', 'K'].includes(card.rank)) {
        total += 10;
      } else if (card.rank === 'A') {
        total += 11;
        aces += 1;
      } else {
        total += parseInt(card.rank);
      }
    }

    // ปรับลดค่า Ace จาก 11 เป็น 1 ถ้าแต้มเกิน 21
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
  
  public state: GameState = 'WAITING';

  constructor(private deck: IDeck) {}

  public startGame(playerIds: number[]) {
    this.state = 'PLAYER_TURN';
    
    // เคลียร์และเซ็ตค่าเริ่มต้นให้ทุกคน
    for (const id of playerIds) {
      this.playersHands.set(id, new Hand());
      this.playerStatuses.set(id, 'PLAYING');
      this.playerResults.set(id, 'PENDING');
    }

    // แจกไพ่ 2 ใบให้ทุกคน รวมถึง Dealer
    for (let i = 0; i < 2; i++) {
      for (const id of playerIds) {
        this.playersHands.get(id)!.addCard(this.deck.draw());
      }
      this.dealerHand.addCard(this.deck.draw());
    }

    // เช็ค Blackjack ทันทีหลังแจกไพ่
    for (const id of playerIds) {
      if (this.playersHands.get(id)!.isBlackjack()) {
        this.playerStatuses.set(id, 'BLACKJACK');
      }
    }

    this.checkAutoResolve();
  }

  public hit(playerId: number): Card | undefined {
    if (this.state !== 'PLAYER_TURN') return undefined;
    const hand = this.playersHands.get(playerId);
    const status = this.playerStatuses.get(playerId);

    if (!hand || status !== 'PLAYING') return undefined;

    const card = this.deck.draw();
    hand.addCard(card);

    if (hand.isBust()) {
      this.playerStatuses.set(playerId, 'BUST');
    } else if (hand.getScore() === 21) {
      this.playerStatuses.set(playerId, 'STAND');
    }

    this.checkAutoResolve();
    return card;
  }

  public stand(playerId: number) {
    if (this.state !== 'PLAYER_TURN') return;
    if (this.playerStatuses.get(playerId) === 'PLAYING') {
      this.playerStatuses.set(playerId, 'STAND');
      this.checkAutoResolve();
    }
  }

  // ถ้าผู้เล่นทุกคน BUST หรือ STAND หมดแล้ว Dealer จะเริ่มเล่นอัตโนมัติ
  private checkAutoResolve() {
    let allDone = true;
    for (const status of Array.from(this.playerStatuses.values())) {
      if (status === 'PLAYING') allDone = false;
    }

    if (allDone && this.state === 'PLAYER_TURN') {
      this.playDealerTurn();
    }
  }

  private playDealerTurn() {
     // เช็คก่อนว่ามีผู้เล่นคนไหนที่ยังไม่ BUST ไหม
    let hasActivePlayer = false;
    for (const status of Array.from(this.playerStatuses.values())) {
      if (status !== 'BUST') {
        hasActivePlayer = true;
        break;
      }
    }

    // Dealer จะจั่วก็ต่อเมื่อมีผู้เล่นที่ยังรอลุ้นอยู่เท่านั้น
    if (hasActivePlayer) {
      while (this.dealerHand.getScore() < 17) {
        this.dealerHand.addCard(this.deck.draw());
      }
    }
    
    this.state = 'RESOLVING';
    this.evaluateWinners();
  }

  private evaluateWinners() {
    const dealerScore = this.dealerHand.getScore();
    const dealerBust = this.dealerHand.isBust();
    const dealerBlackjack = this.dealerHand.isBlackjack();

    for (const [playerId, hand] of Array.from(this.playersHands.entries())) {
      const status = this.playerStatuses.get(playerId);
      const score = hand.getScore();

      if (status === 'BUST') {
        this.playerResults.set(playerId, 'LOSE');
        continue;
      }

      if (status === 'BLACKJACK') {
        this.playerResults.set(playerId, dealerBlackjack ? 'DRAW' : 'WIN');
        continue;
      }

      // กรณีธรรมดา
      if (dealerBust) {
        this.playerResults.set(playerId, 'WIN');
      } else if (score > dealerScore) {
        this.playerResults.set(playerId, 'WIN');
      } else if (score < dealerScore) {
        this.playerResults.set(playerId, 'LOSE');
      } else {
        this.playerResults.set(playerId, 'DRAW');
      }
    }
  }

  // --- Getters สำหรับดูสถานะ ---
  public getHand(playerId: number) { return this.playersHands.get(playerId); }
  public getDealerHand() { return this.dealerHand; }
  public getResult(playerId: number) { return this.playerResults.get(playerId); }
  public getStatus(playerId: number) { return this.playerStatuses.get(playerId); }
}