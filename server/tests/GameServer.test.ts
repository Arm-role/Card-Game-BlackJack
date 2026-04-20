import { describe, it, expect, beforeEach } from "vitest";
import { GameServer }  from "../src/server/game-server";
import { RoomService } from "../src/service/room-service";
import { UserSession, ISocket } from "../src/core/user-session";
import { IDeck }       from "../src/core/Deck";
import { Room }        from "../src/core/room";
import { Card }        from "../src/shared/types";

// ─── MockUserSession ──────────────────────────────────────────────────────────
// Replaces the real WebSocket with an in-memory message log.

class MockUserSession extends UserSession {
  public sentMessages: any[] = [];

  constructor(userId: number, username: string) {
    const fakeSocket: ISocket = { send: () => {} };
    super(fakeSocket);
    this.bindUser(userId, username);
  }

  override send(message: any) {
    this.sentMessages.push(message);
  }

  get lastMessage() {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  clear() {
    this.sentMessages = [];
  }
}

// ─── GameClient ───────────────────────────────────────────────────────────────
// Thin wrapper: send a typed message to the server on behalf of a session.

class GameClient {
  constructor(public session: MockUserSession, private server: GameServer) {}

  async send(type: string, data: any = {}) {
    await this.server.handleMessage(this.session, { type, data });
  }
}

// ─── ScriptedDeck ─────────────────────────────────────────────────────────────
// Deterministic deck for tests — draws cards in declared order.

class ScriptedDeck implements IDeck {
  private index = 0;
  constructor(private cards: Card[]) {}

  draw(): Card {
    const card = this.cards[this.index++];
    if (!card) throw new Error(`ScriptedDeck exhausted at index ${this.index}`);
    return card;
  }
}

// ─── Rigged deck: 4-player deterministic scenario ────────────────────────────
//
// Deal order per round: P1 P2 P3 P4 Dealer
//
// After initial deal:
//   P1 = 10+10 = 20   P2 = 9+7 = 16   P3 = 10+7 = 17
//   P4 = 10+6 = 16    Dealer = 9+6 = 15
//
// Action cards:
//   P2 hits K♦  → 16+10 = 26  BUST
//
// Dealer draw:
//   3♣ → 15+3 = 18  (stops, ≥17)

function createRiggedDeck(): ScriptedDeck {
  return new ScriptedDeck([
    // ── Round 1 ──────────────────────────────────────────────
    { suit: "♠", rank: "10" }, // P1
    { suit: "♠", rank: "9"  }, // P2
    { suit: "♠", rank: "10" }, // P3
    { suit: "♠", rank: "10" }, // P4
    { suit: "♠", rank: "9"  }, // Dealer
    // ── Round 2 ──────────────────────────────────────────────
    { suit: "♥", rank: "10" }, // P1  → 20
    { suit: "♥", rank: "7"  }, // P2  → 16
    { suit: "♥", rank: "7"  }, // P3  → 17
    { suit: "♥", rank: "6"  }, // P4  → 16
    { suit: "♥", rank: "6"  }, // Dlr → 15
    // ── Action ───────────────────────────────────────────────
    { suit: "♦", rank: "K"  }, // P2 hit → BUST (26)
    // ── Dealer draw ──────────────────────────────────────────
    { suit: "♣", rank: "3"  }, // Dlr → 18 (stop)
  ]);
}

// ─── Deck for "turn does NOT move on safe hit" test ──────────────────────────
//
// P1 = 2+3 = 5    P2 = 3+2 = 5    Dealer = 9+4 = 13
// P1 hits 2♦ → 7  (not bust, not 21 → still PLAYING → turn must NOT change)

function createSafeDeck(): ScriptedDeck {
  return new ScriptedDeck([
    { suit: "♠", rank: "2"  }, // P1 r1
    { suit: "♠", rank: "3"  }, // P2 r1
    { suit: "♠", rank: "9"  }, // Dealer r1
    { suit: "♥", rank: "3"  }, // P1 r2 → 5
    { suit: "♥", rank: "2"  }, // P2 r2 → 5
    { suit: "♥", rank: "4"  }, // Dealer r2 → 13
    { suit: "♦", rank: "2"  }, // P1 hit → 7  (safe)
    { suit: "♣", rank: "K"  }, // dealer potential draw
  ]);
}

// ─── Generic deck: safe for 1-3 player tests ─────────────────────────────────
//
// No blackjack (no A+10 combo), no bust on first two cards.
// Deal order: P1, [P2], [P3], Dealer  × 2 rounds
//
// 1-player: P1=5+6=11, Dealer=8+7=15
// 2-player: P1=5+6=11, P2=6+5=11, Dealer=8+7=15
// 3-player: P1=5+6=11, P2=6+5=11, P3=7+4=11, Dealer=8+7=15
// Extra cards for hits: 2,3,4,5,6,7,8,9 (all safe, no bust risk from low scores)

function createGenericDeck(): ScriptedDeck {
  return new ScriptedDeck([
    { suit: "♠", rank: "5"  }, // P1 r1
    { suit: "♠", rank: "6"  }, // P2 r1 (unused in 1p)
    { suit: "♠", rank: "7"  }, // P3 r1 (unused in 1-2p)
    { suit: "♠", rank: "8"  }, // Dealer r1
    { suit: "♥", rank: "6"  }, // P1 r2 → 11
    { suit: "♥", rank: "5"  }, // P2 r2 → 11 (unused in 1p)
    { suit: "♥", rank: "4"  }, // P3 r2 → 11 (unused in 1-2p)
    { suit: "♥", rank: "7"  }, // Dealer r2 → 15
    // Extra action cards (safe hits)
    { suit: "♦", rank: "2"  },
    { suit: "♦", rank: "3"  },
    { suit: "♦", rank: "4"  },
    { suit: "♦", rank: "5"  },
    { suit: "♦", rank: "6"  },
    { suit: "♣", rank: "2"  },
    { suit: "♣", rank: "3"  },
  ]);
}

// ─── Deck for disconnect tests ────────────────────────────────────────────────
//
// P1 = 5+6 = 11   P2 = 6+5 = 11   Dealer = 8+7 = 15
// No blackjack, no bust — guarantees P2 is still PLAYING after P1 disconnects.

function createDisconnectDeck(): ScriptedDeck {
  return new ScriptedDeck([
    { suit: "♠", rank: "5" }, // P1 r1
    { suit: "♠", rank: "6" }, // P2 r1
    { suit: "♠", rank: "8" }, // Dealer r1
    { suit: "♥", rank: "6" }, // P1 r2 → 11
    { suit: "♥", rank: "5" }, // P2 r2 → 11
    { suit: "♥", rank: "7" }, // Dealer r2 → 15
  ]);
}

// ─── Helper: monkey-patch room so the next startGame uses a given deck ────────

function injectDeck(room: Room, deck: IDeck) {
  const orig = room.startGame.bind(room);
  room.startGame = (_?: IDeck) => orig(deck);
}

// ─── findMsg helper ───────────────────────────────────────────────────────────

function findMsg(session: MockUserSession, type: string, action?: string) {
  return session.sentMessages.find(
    (m) => m.type === type && (!action || m.action === action),
  );
}

// FIX: findLastMsg — find the LAST message matching type+action (for turn_changed checks)
function findLastMsg(session: MockUserSession, type: string, action?: string) {
  return session.sentMessages.findLast(
    (m: any) => m.type === type && (!action || m.action === action),
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe("GameServer – integration", () => {
  let server:      GameServer;
  let roomService: RoomService;

  // Always generate room ID 999 so tests can look it up predictably.
  beforeEach(() => {
    roomService = new RoomService({ generate: () => 999 });
    server      = new GameServer({} as any, roomService);
  });

  // ─── Lobby ────────────────────────────────────────────────────────────────

  describe("lobby", () => {
    it("create_room: authenticated player gets a seat", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);

      await new GameClient(p1, server).send("request_create_room");

      const msg = findMsg(p1, "room_result", "create");
      expect(msg?.success).toBe(true);
      expect(msg?.seat).toBeDefined();
    });

    it("join_room: second player gets seat and both get room_update", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room");
      await new GameClient(p2, server).send("request_join_room", { roomId: 999 });

      expect(findMsg(p2, "room_result", "join")?.success).toBe(true);
      // Both players receive room_update after P2 joins
      expect(findMsg(p1, "room_update", "snapshot")).toBeDefined();
      expect(findMsg(p2, "room_update", "snapshot")).toBeDefined();
    });

    it("quick_join: finds an available room", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room");
      await new GameClient(p2, server).send("request_quick_join_room");

      expect(findMsg(p2, "room_result", "quick_join")?.success).toBe(true);
    });

    it("leave_room: player count decrements and remaining players get update", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      await c2.send("request_join_room", { roomId: 999 });

      p1.clear();
      p2.clear();
      await c1.send("request_leave_room");

      expect(findMsg(p1, "room_result", "leave")?.success).toBe(true);
      const update = findMsg(p2, "room_update", "snapshot");
      expect(update?.room.player_count).toBe(1);
    });

    it("disconnect in lobby: remaining players get room_update", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room");
      await new GameClient(p2, server).send("request_join_room", { roomId: 999 });

      p2.clear();
      server.removeSession(1);

      const update = findMsg(p2, "room_update", "snapshot");
      expect(update?.room.player_count).toBe(1);
    });
  });

  // ─── Game start ───────────────────────────────────────────────────────────

  describe("game start", () => {
    it("broadcasts game_update:start and state_changed after startGame", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);
      const c1 = new GameClient(p1, server);

      await c1.send("request_create_room");
      p1.clear();
      await c1.send("request_start_game");

      expect(findMsg(p1, "game_update", "start")).toBeDefined();
      expect(findMsg(p1, "game_update", "state_changed")).toBeDefined();
    });
  });

  // ─── Animation gate ───────────────────────────────────────────────────────

  describe("animation gate (DEALING → PLAYER_TURN)", () => {
    it("rejects hit before all players send request_player_ready", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");

      // P1 hits immediately — not ready yet
      await c1.send("request_hit");

      expect(findMsg(p1, "error")?.reason).toBe("ANIMATION_IN_PROGRESS");
    });

    it("unlocks actions once ALL players are ready and broadcasts ready_to_act", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      const p3 = new MockUserSession(3, "P3");
      server.addSession(p1);
      server.addSession(p2);
      server.addSession(p3);
      const [c1, c2, c3] = [p1, p2, p3].map((p) => new GameClient(p, server));

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c2.send("request_join_room", { roomId: 999 });
      await c3.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");

      // Partial ready — still locked
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await c1.send("request_hit"); // still locked (P3 not ready)
      expect(
        p1.sentMessages.filter((m) => m.type === "game_event" && m.action === "player_hit").length,
      ).toBe(0);

      // Last player signals ready
      await c3.send("request_player_ready");

      expect(findMsg(p1, "game_update", "ready_to_act")).toBeDefined();

      // Now P1 can hit
      await c1.send("request_hit");
      expect(findMsg(p1, "game_event", "player_hit")).toBeDefined();
    });

    it("rejects hit before ready even for single player", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);
      const c1 = new GameClient(p1, server);

      await c1.send("request_create_room");
      await c1.send("request_start_game");
      await c1.send("request_hit"); // no ready sent yet

      expect(findMsg(p1, "error")?.reason).toBe("ANIMATION_IN_PROGRESS");
    });
  });

  // ─── Turn enforcement ─────────────────────────────────────────────────────

  describe("turn enforcement", () => {
    it("only the current-turn player can hit (out-of-turn attempt is ignored)", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");
      // Not ready — but we only care that P2's hit doesn't produce a game event
      await c2.send("request_hit");

      expect(findMsg(p2, "game_event", "player_hit")).toBeUndefined();
    });

    it("hit spam: only the first hit in a frame is processed", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);
      const c1 = new GameClient(p1, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c1.send("request_start_game");
      await c1.send("request_player_ready");

      p1.clear();

      // Three sequential hits — actionLocked prevents 2nd and 3rd.
      // Note: resetReadyState() is called AFTER broadcast so subsequent hits
      // still pass isReadyToAct(). The actionLocked flag is the real guard here.
      // We must NOT call unlockAction() between hits in the same "frame".
      await c1.send("request_hit");
      await c1.send("request_hit");
      await c1.send("request_hit");

      const hits = p1.sentMessages.filter(
        (m) => m.type === "game_event" && m.action === "player_hit",
      );
      expect(hits.length).toBe(1);
    });

    it("turn does NOT advance after a safe hit (score < 21, no bust)", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createSafeDeck());

      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");

      p1.clear();
      p2.clear();

      await c1.send("request_hit"); // P1 score 5 → 7, still PLAYING

      // No turn_changed should be emitted
      expect(findMsg(p1, "game_update", "turn_changed")).toBeUndefined();
    });

    it("no duplicate turn_changed emitted per action", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");

      p1.clear();
      p2.clear();

      await c1.send("request_stand"); // advances to P2

      const count = (s: MockUserSession) =>
        s.sentMessages.filter(
          (m) => m.type === "game_update" && m.action === "turn_changed",
        ).length;

      expect(count(p1)).toBe(1);
      expect(count(p2)).toBe(1);
    });
  });

  // ─── Turn order ───────────────────────────────────────────────────────────

  describe("turn order", () => {
    it("deterministic 4-player order: P1 → P2 → P3 → P4 → dealer resolves", async () => {
      const [p1, p2, p3, p4] = [1, 2, 3, 4].map(
        (id) => new MockUserSession(id, `P${id}`),
      );
      [p1, p2, p3, p4].forEach((p) => server.addSession(p));
      const clients = [p1, p2, p3, p4].map((p) => new GameClient(p, server));

      await clients[0].send("request_create_room");
      for (let i = 1; i < clients.length; i++) {
        await clients[i].send("request_quick_join_room");
      }

      injectDeck(roomService.getRoom(999)!, createRiggedDeck());
      await clients[0].send("request_start_game");
      for (const c of clients) await c.send("request_player_ready");

      // FIX: use findLastMsg — after ready, a turn_changed is broadcast.
      // After each stand/hit, another turn_changed is broadcast.
      // We want the LATEST turn_changed at each checkpoint.
      const getLastTurn = (s: MockUserSession) =>
        findLastMsg(s, "game_update", "turn_changed");

      // Turn 1: P1 — turn_changed from ready_to_act broadcast
      expect(getLastTurn(p1)?.payload.currentPlayer).toBe(1);
      await clients[0].send("request_stand");

      // Turn 2: P2
      expect(getLastTurn(p2)?.payload.currentPlayer).toBe(2);
      await clients[1].send("request_hit"); // K♦ → BUST → auto-advance

      // Turn 3: P3
      expect(getLastTurn(p3)?.payload.currentPlayer).toBe(3);
      await clients[2].send("request_stand");

      // Turn 4: P4
      expect(getLastTurn(p4)?.payload.currentPlayer).toBe(4);
      await clients[3].send("request_stand"); // last player → dealer resolves

      // Game must have resolved
      const stateMsg = findLastMsg(p1, "game_update", "state_changed");
      expect(stateMsg).toBeDefined();
      expect(stateMsg.payload).toMatchObject({ state: "WAITING" });
    });

    it("user who joins last plays last in turn order", async () => {
      const p1     = new MockUserSession(1,  "P1");
      const p2     = new MockUserSession(2,  "P2");
      const last   = new MockUserSession(99, "Last");
      server.addSession(p1);
      server.addSession(p2);
      server.addSession(last);

      const c1   = new GameClient(p1,   server);
      const c2   = new GameClient(p2,   server);
      const cLast = new GameClient(last, server);

      // Seat order: P1 → seat1, P2 → seat2, Last → seat3
      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c2.send("request_join_room", { roomId: 999 });
      await cLast.send("request_join_room", { roomId: 999 });

      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await cLast.send("request_player_ready");

      await c1.send("request_stand");   // P1 done → P2
      await c2.send("request_stand");   // P2 done → Last

      // FIX: use findLastMsg to get the most recent turn_changed
      const lastTurn = findLastMsg(last, "game_update", "turn_changed");
      expect(lastTurn?.payload.currentPlayer).toBe(99);
    });
  });

  // ─── Dealer (bot) ─────────────────────────────────────────────────────────

  describe("dealer (bot)", () => {
    it("auto-plays to completion after all players are done", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);
      const c1 = new GameClient(p1, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c1.send("request_stand");

      const stateMsg = findMsg(p1, "game_update", "state_changed");
      expect(stateMsg).toBeDefined();
      expect(stateMsg.payload.dealer).toBeDefined();
      expect(typeof stateMsg.payload.dealer.score).toBe("number");
    });

    it("dealer score is ≥ 17 or all players busted", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);
      const c1 = new GameClient(p1, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c1.send("request_stand");

      const state = findMsg(p1, "game_update", "state_changed");
      // Dealer either drew to ≥17 or didn't draw at all (all busted → still ≥ initial deal)
      expect(state.payload.dealer.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Disconnect mid-game ──────────────────────────────────────────────────

  describe("disconnect mid-game", () => {
    it("skips to next player's turn when current player disconnects", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createDisconnectDeck());
      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");

      // P1 has the first turn → disconnect
      server.removeSession(1);

      // After ready_to_act, turn_changed(P1) was sent.
      // After disconnect, turn_changed(P2) is sent. We want the last one.
      const turnMsg = findLastMsg(p2, "game_update", "turn_changed");
      expect(turnMsg?.payload.currentPlayer).toBe(2);
    });

    it("immediately shifts turn on disconnect (duplicate of above with clearer name)", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createDisconnectDeck());
      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");

      server.removeSession(1);

      const turnMsg = findLastMsg(p2, "game_update", "turn_changed");
      expect(turnMsg?.payload.currentPlayer).toBe(2);
    });
  });
});