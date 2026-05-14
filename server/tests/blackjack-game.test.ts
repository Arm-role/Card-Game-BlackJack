import { describe, it, expect } from "vitest";
import { BlackjackGame } from "../src/domain/entities/blackjack-game.js";
import { IDeck } from "../src/domain/entities/deck.js";
import { Card } from "../src/domain/types.js";

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
    // ลำดับแจก (1 player):
    //   รอบ 1: P1 = A♠   Dealer = 9♦
    //   รอบ 2: P1 = A♥   Dealer = 9♣   → P1 มี A+A = 12  (ไม่ bust เพราะ A ลดเป็น 1)
    //   hit:   P1 = 10♠  → A+A+10 = 12  (A ใบแรกลดเป็น 1, A ใบสอง = 11 → 1+11+10=22 bust? → ลด A ใบสองเป็น 1 = 12)

    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: "♠", rank: "A" }, // P1 ใบ 1
      { suit: "♦", rank: "9" }, // Dealer ใบ 1
      // รอบ 2
      { suit: "♥", rank: "A" }, // P1 ใบ 2  → P1 มี A+A = 12
      { suit: "♣", rank: "9" }, // Dealer ใบ 2
      // hit
      { suit: "♠", rank: "10" }, // P1 hit → A+A+10 = 12 (ไม่ bust)
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
    // รอบ 1: P1=10♠  Dealer=2♦
    // รอบ 2: P1=10♥  Dealer=2♣  → P1=20  Dealer=4
    // hit:   P1=5♠   → P1=25 BUST
    // เมื่อ player ทุกคน bust → playDealerTurn() ถูกเรียก (dealer ไม่ต้องจั่วเพิ่ม)
    // state ควรเป็น "RESOLVING" และ P1 = LOSE

    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: "♠", rank: "10" }, // P1
      { suit: "♦", rank: "2" }, // Dealer
      // รอบ 2
      { suit: "♥", rank: "10" }, // P1 → 20
      { suit: "♣", rank: "2" }, // Dealer → 4
      // hit
      { suit: "♠", rank: "5" }, // P1 hit → 25 BUST
    ]);

    const game = new BlackjackGame(fakeDeck);
    game.startGame([1]);

    game.hit(1); // → BUST → areAllPlayersDone() → playDealerTurn() ถูกเรียกอัตโนมัติ

    if (game.areAllPlayersDone()) {
      game.playDealerTurn();
    }

    expect(game.state).toBe("RESOLVING");
    expect(game.getStatus(1)).toBe("BUST");
    expect(game.getResult(1)).toBe("LOSE");
  });

  // ─── 3. Player Stand → Dealer draws ──────────────────────────────────────

  it("3. Flow ของเกม: Player Stand → Dealer จั่วจนกว่าจะถึง 17", () => {
    // รอบ 1: P1=10♠  Dealer=10♦
    // รอบ 2: P1=10♥  Dealer=5♣   → P1=20  Dealer=15 (ต้องจั่วเพิ่ม)
    // dealer draw: 4♠ → Dealer=19 (≥17 หยุด)
    // P1(20) vs Dealer(19) → P1 WIN

    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: "♠", rank: "10" }, // P1
      { suit: "♦", rank: "10" }, // Dealer
      // รอบ 2
      { suit: "♥", rank: "10" }, // P1 → 20
      { suit: "♣", rank: "5" }, // Dealer → 15
      // dealer draw
      { suit: "♠", rank: "4" }, // Dealer → 19
    ]);

    const game = new BlackjackGame(fakeDeck);
    game.startGame([1]);

    game.stand(1); // → areAllPlayersDone() → playDealerTurn() อัตโนมัติ

    if (game.areAllPlayersDone()) {
      game.playDealerTurn();
    }

    expect(game.state).toBe("RESOLVING");
    expect(game.getDealerHand().getScore()).toBe(19);
    expect(game.getResult(1)).toBe("WIN");
  });

  // ─── 4. 2 ผู้เล่น ─────────────────────────────────────────────────────────

  it("4. เกมแบบผู้เล่น 2 คน: P1 ยืน, P2 บัสต์, Dealer เล่นต่อสู้กับ P1", () => {
    // ลำดับแจก (2 players):
    //   รอบ 1: P1=A♠  P2=10♥  Dealer=10♦
    //   รอบ 2: P1=10♣  P2=6♠   Dealer=5♥   → P1=21(BJ)  P2=16  Dealer=15
    //
    // ตาผู้เล่น:
    //   P1 stand (มี blackjack → สถานะ BLACKJACK อยู่แล้ว)
    //   P2 hit K♠ → 16+10=26 BUST
    //
    // dealer draw:
    //   3♦ → 15+3=18 (≥17 หยุด)
    //
    // ผล: P1(BJ) WIN, P2(BUST) LOSE

    const fakeDeck = new FakeDeck([
      // รอบ 1
      { suit: "♠", rank: "A" }, // P1 ใบ 1
      { suit: "♥", rank: "10" }, // P2 ใบ 1
      { suit: "♦", rank: "10" }, // Dealer ใบ 1
      // รอบ 2
      { suit: "♣", rank: "10" }, // P1 ใบ 2 → A+10=21 BLACKJACK
      { suit: "♠", rank: "6" }, // P2 ใบ 2 → 10+6=16
      { suit: "♥", rank: "5" }, // Dealer ใบ 2 → 10+5=15
      // ตาผู้เล่น
      { suit: "♠", rank: "K" }, // P2 hit → 16+10=26 BUST
      // dealer draw
      { suit: "♦", rank: "3" }, // Dealer → 15+3=18
    ]);

    const game = new BlackjackGame(fakeDeck);
    game.startGame([1, 2]);

    // P1 มี Blackjack อยู่แล้ว (status = BLACKJACK) → stand() จะ no-op แต่เรียกได้
    // ในการใช้งานจริง GameSession จะ skip P1 ไปเลย แต่ในระดับ BlackjackGame
    // เราเรียก stand() ได้ตรงๆ เฉพาะถ้า status ยัง "PLAYING"
    // P1 เป็น BLACKJACK แล้ว → ไม่ต้องเรียก stand()

    // เกมต้องยังไม่จบ — P2 ยังไม่ได้เล่น
    expect(game.state).toBe("PLAYER_TURN");

    // P2 hit → BUST → ทุกคนจบ → dealer อัตโนมัติ
    game.hit(2);

    if (game.areAllPlayersDone()) {
      game.playDealerTurn();
    }

    expect(game.state).toBe("RESOLVING");

    expect(game.getHand(1)!.getScore()).toBe(21);
    expect(game.getHand(2)!.getScore()).toBe(26);
    expect(game.getDealerHand().getScore()).toBe(18);

    expect(game.getStatus(1)).toBe("BLACKJACK");
    expect(game.getResult(1)).toBe("WIN");

    expect(game.getStatus(2)).toBe("BUST");
    expect(game.getResult(2)).toBe("LOSE");
  });
});