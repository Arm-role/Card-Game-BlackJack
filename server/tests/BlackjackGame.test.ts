import { describe, it, expect } from 'vitest';
import { BlackjackGame } from '../src/core/BlackjackGame';
import { IDeck } from '../src/core/Deck';
import { Card } from '../src/shared/types';

// FakeDeck เอาไว้ล็อกผลการจั่วไพ่ เพื่อเทส logic
class FakeDeck implements IDeck {
  constructor(private cards: Card[]) { }
  draw(): Card {
    const card = this.cards.shift();
    if (!card) throw new Error("❌ FakeDeck ไพ่หมดกอง! กรุณาเพิ่มไพ่ใน Mock");
    return card;
  }
}

describe('Blackjack Core Game Rules', () => {

  // แจกไพ่ในเกมจะสลับกัน: P1 ใบที่ 1 -> Dealer ใบที่ 1 -> P1 ใบที่ 2 -> Dealer ใบที่ 2
  it('1. แต้ม Ace ต้องเปลี่ยนจาก 11 เป็น 1 ได้ถ้าเกิด Bust', () => {
    const mockDeck = new FakeDeck([
      { suit: '♠', rank: 'A' },  // [แจกใบที่ 1] Player 1
      { suit: '♦', rank: '9' },  // [แจกใบที่ 2] Dealer
      { suit: '♥', rank: 'A' },  // [แจกใบที่ 3] Player 1 (มี A 2 ใบ รวมเป็น 12)
      { suit: '♣', rank: '9' },  // [แจกใบที่ 4] Dealer
      { suit: '♠', rank: '10' }  // Player 1 ขอจั่ว Hit 10 -> มี (A, A, 10) รวมแล้วต้องได้ 12 
    ]);

    const game = new BlackjackGame(mockDeck);
    game.startGame([1]);

    // จั่วไพ่เพิ่ม 1 ใบ
    game.hit(1);

    const p1Hand = game.getHand(1)!;
    expect(p1Hand.getScore()).toBe(12);
    expect(p1Hand.isBust()).toBe(false); // ต้องไม่ BUST
  });

  it('2. Flow ของเกม: Player Bust -> Dealer ชนะอัตโนมัติ', () => {
    const mockDeck = new FakeDeck([
      { suit: '♠', rank: '10' }, // [แจกใบที่ 1] Player 1
      { suit: '♦', rank: '2' },  // [แจกใบที่ 2] Dealer
      { suit: '♥', rank: '10' }, // [แจกใบที่ 3] Player 1 (รวม 20)
      { suit: '♣', rank: '2' },  // [แจกใบที่ 4] Dealer (รวม 4)
      { suit: '♠', rank: '5' }   // Player 1 กด Hit (จั่วได้ 5 รวมเป็น 25 -> BUST)
    ]);
 
    const game = new BlackjackGame(mockDeck);
    game.startGame([1]);

    game.hit(1); // Player จั่วแล้ว Bust

    // เมื่อ Bust ทุกคน เกมต้องจบ และ Dealer ไม่ต้องจั่วเพิ่ม
    expect(game.state).toBe('RESOLVED');
    expect(game.getStatus(1)).toBe('BUST');
    expect(game.getResult(1)).toBe('LOSE');
  });

  it('3. Flow ของเกม: Player Stand -> Dealer จั่วจนกว่าจะถึง 17', () => {
    const mockDeck = new FakeDeck([
      { suit: '♠', rank: '10' }, // [แจกใบที่ 1] Player 1
      { suit: '♦', rank: '10' }, // [แจกใบที่ 2] Dealer
      { suit: '♥', rank: '10' }, // [แจกใบที่ 3] Player 1 (รวม 20)
      { suit: '♣', rank: '5' },  // [แจกใบที่ 4] Dealer (รวม 15 -> ต้องจั่วเพิ่ม)
      { suit: '♠', rank: '4' }   // Dealer จั่วอัตโนมัติ (รวม 19 -> หยุดจั่ว)
    ]);

    const game = new BlackjackGame(mockDeck);
    game.startGame([1]);

    game.stand(1); // Player กดหยุด

    // เกมจบ P1(20) vs Dealer(19) -> P1 ชนะ
    expect(game.state).toBe('RESOLVED');
    expect(game.getDealerHand().getScore()).toBe(19);
    expect(game.getResult(1)).toBe('WIN');
  });

  it('4. เกมแบบผู้เล่น 2 คน: P1 ยืน, P2 บัสต์, Dealer เล่นต่อสู้กับ P1', () => {
    // ลำดับการแจก: P1 -> P2 -> Dealer -> P1 -> P2 -> Dealer
    const mockDeck = new FakeDeck([
      { suit: '♠', rank: 'A' }, // [แจกใบที่ 1] Player 1
      { suit: '♥', rank: '10' }, // [แจกใบที่ 2] Player 2
      { suit: '♦', rank: '10' }, // [แจกใบที่ 3] Dealer
      { suit: '♣', rank: '10' }, // [แจกใบที่ 4] Player 1 (รวม 20)
      { suit: '♠', rank: '6' },  // [แจกใบที่ 5] Player 2 (รวม 16)
      { suit: '♥', rank: '5' },  // [แจกใบที่ 6] Dealer (รวม 15)

      // -- จบช่วงแจกไพ่ --

      { suit: '♠', rank: 'K' }, // [ใบที่ 7] รอให้คนกด Hit จั่ว (จะโดน P2 จั่ว)
      { suit: '♦', rank: '3' },  // [ใบที่ 8] รอให้ Dealer จั่วอัตโนมัติตอนจบ
      { suit: '♦', rank: '6' },
      { suit: '♦', rank: '7' }
    ]);

    const game = new BlackjackGame(mockDeck);

    // เริ่มเกมพร้อมกัน 2 คน ให้ P1(id=1) และ P2(id=2)
    game.startGame([1, 2]);

    // --- เริ่มตาของผู้เล่น ---

    // Player 1 พอใจกับ 20 แต้ม เลยขอ Stand
    game.stand(1);

    // ณ ตอนนี้เกมต้องยังไม่จบ (เพราะ Player 2 ยังไม่ได้เล่น)
    expect(game.state).toBe('PLAYING');

    // Player 2 มี 16 แต้ม เลยขอ Hit (จั่วได้ 10 ทำให้รวมเป็น 26 -> BUST)
    game.hit(2);

    // --- จบตาผู้เล่น เกมจะประมวลผล Dealer อัตโนมัติ ---

    // ตรวจสอบว่าระบบทำงานครบถ้วน
    expect(game.state).toBe('RESOLVED'); // สถานะห้องต้องเป็นจบเกม

    // ตรวจสอบแต้มของแต่ละคน
    expect(game.getHand(1)!.getScore()).toBe(21);
    expect(game.getHand(2)!.getScore()).toBe(26);
    expect(game.getDealerHand().getScore()).toBe(18); // Dealer เดิมมี 15 จั่วใบที่ 8 (3) เข้าไปรวมเป็น 18

    // ตรวจสอบผลแพ้-ชนะ
    expect(game.getStatus(1)).toBe('BLACKJACK');
    expect(game.getResult(1)).toBe('WIN');  // P1(20) ชนะ Dealer(18)

    expect(game.getStatus(2)).toBe('BUST');
    expect(game.getResult(2)).toBe('LOSE'); // P2 แพ้เพราะ Bust เกิน 21 แต้ม
  });
});