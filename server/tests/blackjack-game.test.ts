import { describe, it, expect } from "vitest";
import { BlackjackGame } from "../src/domain/entities/blackjack-game.js";
import { IDeck } from "../src/domain/entities/deck.js";
import { Card, GameState, GameResult, PlayerStatus, Rank, Suit } from "../src/domain/types.js";

// ─── FakeDeck ─────────────────────────────────────────────────────────────────
// ล็อกลำดับไพ่เพื่อให้ผลลัพธ์แน่นอน

class FakeDeck implements IDeck {
  constructor(private cards: Card[]) { }

  draw(): Card {
    const card = this.cards.shift();
    if (!card) throw new Error("FakeDeck ไพ่หมด — กรุณาเพิ่มไพ่ใน mock");
    return card;
  }
}

// ─── หมายเหตุลำดับการแจกไพ่ ──────────────────────────────────────────────────
//
// BlackjackGame.startGame() แจกแบบ "round robin ต่อรอบ" คือ:
//
//   รอบที่ 1:  P1 ใบ1, P2 ใบ1, ..., Dealer ใบ1
//   รอบที่ 2:  P1 ใบ2, P2 ใบ2, ..., Dealer ใบ2
//
// ต่างจาก comment เดิมที่เขียนว่า P1→Dealer→P1→Dealer
// ให้จัดลำดับไพ่ใน FakeDeck ตามรูปแบบนี้เสมอ

// ─────────────────────────────────────────────────────────────────────────────

describe("Blackjack Core Game Rules", () => {

  // ─── 1. Ace ───────────────────────────────────────────────────────────────

  it("1. แต้ม Ace ต้องเปลี่ยนจาก 11 เป็น 1 ได้ถ้าเกิด Bust", () => {
    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: Suit.SPADES,   rank: Rank.ACE   }, // P1 ใบ 1
      { suit: Suit.DIAMONDS, rank: Rank.NINE  }, // Dealer ใบ 1
      // รอบ 2
      { suit: Suit.HEARTS,   rank: Rank.ACE   }, // P1 ใบ 2  → P1 มี A+A = 12
      { suit: Suit.CLUBS,    rank: Rank.NINE  }, // Dealer ใบ 2
      // hit
      { suit: Suit.SPADES,   rank: Rank.TEN   }, // P1 hit → A+A+10 = 12 (ไม่ bust)
    ]);

    const game = new BlackjackGame(fakeDeck);
    game.startGame([1]);

    game.hit(1);

    const p1Hand = game.getHand(1)!;
    expect(p1Hand.getScore()).toBe(12);
    expect(p1Hand.isBust()).toBe(false);
  });

  // ─── 2. Player Bust ───────────────────────────────────────────────────────

  it("2. Flow ของเกม: Player Bust → Dealer ชนะอัตโนมัติ", () => {
    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: Suit.SPADES,   rank: Rank.TEN  }, // P1
      { suit: Suit.DIAMONDS, rank: Rank.TWO  }, // Dealer
      // รอบ 2
      { suit: Suit.HEARTS,   rank: Rank.TEN  }, // P1 → 20
      { suit: Suit.CLUBS,    rank: Rank.TWO  }, // Dealer → 4
      // hit
      { suit: Suit.SPADES,   rank: Rank.FIVE }, // P1 hit → 25 BUST
    ]);

    const game = new BlackjackGame(fakeDeck);
    game.startGame([1]);

    game.hit(1);

    if (game.areAllPlayersDone()) {
      game.playDealerTurn();
    }

    expect(game.state).toBe(GameState.RESOLVING);
    expect(game.getStatus(1)).toBe(PlayerStatus.BUST);
    expect(game.getResult(1)).toBe(GameResult.LOSE);
  });

  // ─── 3. Player Stand → Dealer draws ──────────────────────────────────────

  it("3. Flow ของเกม: Player Stand → Dealer จั่วจนกว่าจะถึง 17", () => {
    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: Suit.SPADES,   rank: Rank.TEN  }, // P1
      { suit: Suit.DIAMONDS, rank: Rank.TEN  }, // Dealer
      // รอบ 2
      { suit: Suit.HEARTS,   rank: Rank.TEN  }, // P1 → 20
      { suit: Suit.CLUBS,    rank: Rank.FIVE }, // Dealer → 15
      // dealer draw
      { suit: Suit.SPADES,   rank: Rank.FOUR }, // Dealer → 19
    ]);

    const game = new BlackjackGame(fakeDeck);
    game.startGame([1]);

    game.stand(1);

    if (game.areAllPlayersDone()) {
      game.playDealerTurn();
    }

    expect(game.state).toBe(GameState.RESOLVING);
    expect(game.getDealerHand().getScore()).toBe(19);
    expect(game.getResult(1)).toBe(GameResult.WIN);
  });

  // ─── 4. 2 ผู้เล่น ─────────────────────────────────────────────────────────

  it("4. เกมแบบผู้เล่น 2 คน: P1 ยืน, P2 บัสต์, Dealer เล่นต่อสู้กับ P1", () => {
    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: Suit.SPADES,   rank: Rank.ACE   }, // P1 ใบ 1
      { suit: Suit.HEARTS,   rank: Rank.TEN   }, // P2 ใบ 1
      { suit: Suit.DIAMONDS, rank: Rank.TEN   }, // Dealer ใบ 1
      // รอบ 2
      { suit: Suit.CLUBS,    rank: Rank.TEN   }, // P1 ใบ 2 → A+10=21 BLACKJACK
      { suit: Suit.SPADES,   rank: Rank.SIX   }, // P2 ใบ 2 → 10+6=16
      { suit: Suit.HEARTS,   rank: Rank.FIVE  }, // Dealer ใบ 2 → 10+5=15
      // ตาผู้เล่น
      { suit: Suit.SPADES,   rank: Rank.KING  }, // P2 hit → 16+10=26 BUST
      // dealer draw
      { suit: Suit.DIAMONDS, rank: Rank.THREE }, // Dealer → 15+3=18
    ]);

    const game = new BlackjackGame(fakeDeck);
    game.startGame([1, 2]);

    expect(game.state).toBe(GameState.PLAYER_TURN);

    game.hit(2);

    if (game.areAllPlayersDone()) {
      game.playDealerTurn();
    }

    expect(game.state).toBe(GameState.RESOLVING);

    expect(game.getHand(1)!.getScore()).toBe(21);
    expect(game.getHand(2)!.getScore()).toBe(26);
    expect(game.getDealerHand().getScore()).toBe(18);

    expect(game.getStatus(1)).toBe(PlayerStatus.BLACKJACK);
    expect(game.getResult(1)).toBe(GameResult.WIN);

    expect(game.getStatus(2)).toBe(PlayerStatus.BUST);
    expect(game.getResult(2)).toBe(GameResult.LOSE);
  });
});
