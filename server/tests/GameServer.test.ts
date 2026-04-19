import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameServer } from '../src/server/game-server';
import { RoomService } from '../src/service/room-service';
import { AuthService } from '../src/service/auth-service';
import { UserSession } from '../src/core/user-session';
import { IDeck } from '../src/core/Deck';
import { Card } from '../src/shared/types';

// --- 1. Mock Session สำหรับดักจับ Message ที่ Server ส่งออกมา ---
class MockUserSession extends UserSession {
  public sentMessages: any[] = [];

  constructor(userId: number, username: string) {
    super({ send: () => { } } as any); // Fake WebSocket
    this.bindUser(userId, username);
  }

  // Override send เพื่อเก็บ log ไว้เช็ค
  send(message: any) {
    this.sentMessages.push(message);
  }

  get lastMessage() {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  clear() { this.sentMessages = []; }
}

// --- 2. Mock GameClient สำหรับเรียกใช้งานง่ายๆ ---
class GameClient {
  constructor(public session: MockUserSession, private server: GameServer) { }

  async send(type: string, data: any = {}) {
    await this.server.handleMessage(this.session, { type, data });
  }
}

class ScriptedDeck implements IDeck {
  private drawIndex = 0;

  constructor(private script: Card[]) { }

  draw(): Card {
    const card = this.script[this.drawIndex++];
    if (!card) {
      throw new Error(`Deck exhausted at index ${this.drawIndex}`);
    }
    return card;
  }
}

function createRiggedDeckForTurnTest() {
  return new ScriptedDeck([
    // ===== แจกไพ่รอบที่ 1 =====
    { suit: '♠', rank: '10' }, // P1
    { suit: '♠', rank: '9' },  // P2
    { suit: '♠', rank: '10' }, // P3
    { suit: '♠', rank: '10' }, // P4
    { suit: '♠', rank: '9' },  // Dealer

    // ===== แจกไพ่รอบที่ 2 =====
    { suit: '♥', rank: '10' }, // P1 → 20
    { suit: '♥', rank: '7' },  // P2 → 16
    { suit: '♥', rank: '7' },  // P3 → 17
    { suit: '♥', rank: '6' },  // P4 → 16
    { suit: '♥', rank: '6' },  // Dealer → 15

    // ===== Action phase =====
    { suit: '♦', rank: 'K' },  // P2 hit → bust (16 + 10 = 26)

    // ===== Dealer draw =====
    { suit: '♣', rank: '3' },  // 15 → 18 (stop)
  ]);
}

describe('GameServer & Room Interactions', () => {
  let server: GameServer;
  let roomService: RoomService;

  beforeEach(() => {
    roomService = new RoomService({ generate: () => 999 } as any);
    server = new GameServer({} as any, roomService);
  });

  // Helper สำหรับหา Message ที่ต้องการ
  const findMsg = (session: MockUserSession, type: string, action?: string) => {
    return session.sentMessages.find(m => m.type === type && (!action || m.action === action));
  };

  it("should handle turn order deterministically for 4 players + dealer", async () => {
    // 🔧 Arrange
    const riggedDeck = createRiggedDeckForTurnTest();

    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");
    const p3 = new MockUserSession(3, "P3");
    const p4 = new MockUserSession(4, "P4");

    const players = [
      p1, p2, p3, p4
    ];

    players.forEach(p => server.addSession(p));

    const clients = players.map(p => new GameClient(p, server));

    // 🧱 Setup room
    await clients[0].send("request_create_room");
    for (let i = 1; i < clients.length; i++) {
      await clients[i].send("request_quick_join_room");
    }

    // ▶ Start game
    await clients[0].send("request_start_game");

    // 🎬 Ready phase
    for (const c of clients) {
      await c.send("request_player_ready");
    }

    const getTurn = (session: MockUserSession) =>
      findMsg(session, "game_update", "turn_changed");

    // 🟢 Turn 1: P1
    let turnMsg = getTurn(players[0]);
    expect(turnMsg.payload.currentPlayer).toBe(1);

    // P1 → stand
    await clients[0].send("request_stand");

    // 🟢 Turn 2: P2
    turnMsg = getTurn(players[1]);
    expect(turnMsg.payload.currentPlayer).toBe(2);

    // P2 → hit → bust (guaranteed)
    await clients[1].send("request_hit");

    // 🟢 Turn 3: P3 (auto skip หลัง bust)
    turnMsg = getTurn(players[2]);
    expect(turnMsg.payload.currentPlayer).toBe(3);

    // P3 → stand
    await clients[2].send("request_stand");

    // 🟢 Turn 4: P4
    turnMsg = getTurn(players[3]);
    expect(turnMsg.payload.currentPlayer).toBe(4);

    // P4 → stand
    await clients[3].send("request_stand");

    // 🟣 Dealer phase → game resolved
    const stateMsg = findMsg(players[0], "game_update", "state_changed");

    expect(stateMsg).toBeDefined();
    expect(stateMsg.payload).toMatchObject({
      state: "WAITING" // หรือ RESOLVED แล้วแต่ implementation
    });
  });

  it('ไม่ควรให้เริ่มเกมถ้าไม่มีผู้เล่น (Logic Check)', async () => {
    const p1 = new MockUserSession(1, "P1");
    server.addSession(p1);
    const c1 = new GameClient(p1, server);

    await c1.send("request_create_room");

    // เคลียร์ก่อนเริ่มเกมเพื่อให้แน่ใจว่าได้ message ใหม่
    p1.clear();
    await c1.send("request_start_game");

    // ค้นหาข้อความ action: start (ซึ่ง server ส่งก่อน broadcast state)
    const startMsg = findMsg(p1, "game_update", "start");
    expect(startMsg).toBeDefined();
    expect(startMsg.action).toBe("start");

    // ตรวจสอบว่ามี state_changed ตามมาด้วย
    const stateMsg = findMsg(p1, "game_update", "state_changed");
    expect(stateMsg).toBeDefined();
  });

  it('ควรจัดการกรณีผู้เล่นตัดการเชื่อมต่อ (Disconnect Flow)', async () => {
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");
    server.addSession(p1);
    server.addSession(p2);

    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);

    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });

    p2.clear();
    server.removeSession(1);

    const disconnectUpdate = findMsg(p2, "room_update", "snapshot");
    expect(disconnectUpdate.room.player_count).toBe(1);
  });

  it('ควรล็อคคำสั่ง Hit จนกว่าจะได้รับคำยืนยันว่าแอนิเมชันจบแล้ว', async () => {
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");
    const p3 = new MockUserSession(3, "P3");
    server.addSession(p1);
    server.addSession(p2);
    server.addSession(p3);

    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);
    const c3 = new GameClient(p3, server);

    // 1. P1 สร้างห้อง
    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });
    await c3.send("request_join_room", { roomId: 999 });

    // 1. เริ่มเกม
    await c1.send("request_start_game");

    // 2. ลองกด Hit ทันที (ต้องไม่สำเร็จ)
    await c1.send("request_hit");
    const errorMsg = findMsg(p1, "error");
    expect(errorMsg.reason).toBe("ANIMATION_IN_PROGRESS");

    // 3. Client ทั้ง 3 คนส่งว่าแอนิเมชันจบแล้ว
    await c1.send("request_player_ready");
    await c2.send("request_player_ready");
    await c3.send("request_player_ready");

    // 4. Server ต้องส่งบอกว่ารอบเริ่มแล้ว
    const readyMsg = findMsg(p1, "game_update", "ready_to_act");
    expect(readyMsg).toBeDefined();

    // 5. คราวนี้ต้องกด Hit ได้
    await c1.send("request_hit");
    const hitEvent = findMsg(p1, "game_event", "player_hit");
    expect(hitEvent).toBeDefined();
  });

  it('ควรให้เฉพาะ current turn player hit ได้', async () => {
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");

    server.addSession(p1);
    server.addSession(p2);

    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);

    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });

    await c1.send("request_start_game");

    // ❌ p2 พยายาม hit ทั้งที่ไม่ใช่ turn
    await c2.send("request_hit");

    const msg = findMsg(p2, "game_event", "player_hit");
    expect(msg).toBeUndefined();
  });
  it('ควรให้ dealer ที่เป็น user เล่นเป็น turn สุดท้าย', async () => {
    const dealer = new MockUserSession(99, "Dealer");
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");

    server.addSession(dealer);
    server.addSession(p1);
    server.addSession(p2);

    const cDealer = new GameClient(dealer, server);
    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);

    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });

    // ⚠️ ต้องมี logic ให้ dealer join เป็น role dealer
    await cDealer.send("request_join_room", { roomId: 999 });

    await c1.send("request_start_game");

    await c1.send("request_player_ready");
    await c2.send("request_player_ready");
    await cDealer.send("request_player_ready");

    // P1 turn
    await c1.send("request_stand");

    // P2 turn
    await c2.send("request_stand");

    // 👉 ควรถึง dealer
    const turnMsg = findMsg(dealer, "game_update", "turn_changed");

    expect(turnMsg.payload.currentPlayer).toBe(99);
  });
  it('ควรข้าม turn เมื่อ player disconnect กลางเกม', async () => {
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");

    server.addSession(p1);
    server.addSession(p2);

    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);

    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });

    await c1.send("request_start_game");

    await c1.send("request_player_ready");
    await c2.send("request_player_ready");

    // P1 เป็น turn → disconnect
    server.removeSession(1);

    const turnMsg = findMsg(p2, "game_update", "turn_changed");

    expect(turnMsg.payload.currentPlayer).toBe(2);
  });
  it('dealer bot ควรเล่นอัตโนมัติเมื่อผู้เล่นจบ', async () => {
    const p1 = new MockUserSession(1, "P1");

    server.addSession(p1);
    const c1 = new GameClient(p1, server);

    await c1.send("request_create_room");
    await c1.send("request_start_game");
    await c1.send("request_player_ready");

    // player คนเดียว → stand เลย
    await c1.send("request_stand");

    const stateMsg = findMsg(p1, "game_update", "state_changed");

    expect(stateMsg).toBeDefined();
    expect(stateMsg.payload.dealer).toBeDefined();
  });

  it('ไม่ควร emit turn_changed ซ้ำสำหรับ action เดียว', async () => {
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");

    server.addSession(p1);
    server.addSession(p2);

    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);

    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });

    await c1.send("request_start_game");

    await c1.send("request_player_ready");
    await c2.send("request_player_ready");

    p1.clear();
    p2.clear();

    await c1.send("request_stand");

    const turnMsgsP1 = p1.sentMessages.filter(
      m => m.type === "game_update" && m.action === "turn_changed"
    );

    const turnMsgsP2 = p2.sentMessages.filter(
      m => m.type === "game_update" && m.action === "turn_changed"
    );

    expect(turnMsgsP1.length).toBe(1);
    expect(turnMsgsP2.length).toBe(1);
  });

  it('ควร move turn เฉพาะเมื่อ status เปลี่ยนเป็น STAND/BUST', async () => {
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");

    server.addSession(p1);
    server.addSession(p2);

    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);

    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });

    await c1.send("request_start_game");

    await c1.send("request_player_ready");
    await c2.send("request_player_ready");

    // hit (ยังไม่ bust)
    await c1.send("request_hit");

    const turnMsg = findMsg(p1, "game_update", "turn_changed");

    // ❌ ไม่ควรเปลี่ยน turn
    expect(turnMsg).toBeUndefined();
  });

  it('ควร ignore hit spam ใน frame เดียวกัน', async () => {
    const p1 = new MockUserSession(1, "P1");

    server.addSession(p1);
    const c1 = new GameClient(p1, server);

    await c1.send("request_create_room");
    await c1.send("request_start_game");
    await c1.send("request_player_ready");

    p1.clear();

    await Promise.all([
      c1.send("request_hit"),
      c1.send("request_hit"),
      c1.send("request_hit"),
    ]);

    const hitEvents = p1.sentMessages.filter(
      m => m.type === "game_event" && m.action === "player_hit"
    );

    expect(hitEvents.length).toBe(1);
  });

  it('ควร shift turn ทันทีเมื่อ current player disconnect', async () => {
    const p1 = new MockUserSession(1, "P1");
    const p2 = new MockUserSession(2, "P2");

    server.addSession(p1);
    server.addSession(p2);

    const c1 = new GameClient(p1, server);
    const c2 = new GameClient(p2, server);

    await c1.send("request_create_room");
    await c2.send("request_join_room", { roomId: 999 });

    await c1.send("request_start_game");
    await c1.send("request_player_ready");
    await c2.send("request_player_ready");

    // P1 turn → disconnect
    server.removeSession(1);

    const turnMsg = findMsg(p2, "game_update", "turn_changed");

    expect(turnMsg.payload.currentPlayer).toBe(2);
  });

  it('ควรให้ dealer เล่นอัตโนมัติจนจบ', async () => {
    const p1 = new MockUserSession(1, "P1");

    server.addSession(p1);
    const c1 = new GameClient(p1, server);

    await c1.send("request_create_room");
    await c1.send("request_start_game");
    await c1.send("request_player_ready");

    await c1.send("request_stand");

    const stateMsg = findMsg(p1, "game_update", "state_changed");

    expect(stateMsg).toBeDefined();
    expect(stateMsg.payload.dealer.score).toBeDefined();
  });

  it('ไม่ควร allow action ก่อน ready', async () => {
    const p1 = new MockUserSession(1, "P1");

    server.addSession(p1);
    const c1 = new GameClient(p1, server);

    await c1.send("request_create_room");
    await c1.send("request_start_game");

    await c1.send("request_hit");

    const errorMsg = findMsg(p1, "error");

    expect(errorMsg.reason).toBe("ANIMATION_IN_PROGRESS");
  });
});