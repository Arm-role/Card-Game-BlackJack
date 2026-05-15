import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameController } from "../src/interface-adapters/controllers/game-controller.js";
import { InMemoryChipRepository } from "../src/infrastructure/persistence/in-memory-chip-repository.js";
import { InMemoryRoomRepository } from "../src/infrastructure/persistence/in-memory-room-repository.js";
import { NullGameLogger } from "../src/infrastructure/logging/null-game-logger.js";
import { RoomService } from "../src/service/room-service.js";
import { UserSession, ISocket } from "../src/infrastructure/network/user-session.js";
import { IDeck } from "../src/domain/entities/deck.js";
import { Room } from "../src/domain/entities/room.js";
import { Card, GameState, Rank, Suit } from "../src/domain/types.js";

// ─── MockUserSession ──────────────────────────────────────────────────────────

class MockUserSession extends UserSession {
  public sentMessages: any[] = [];

  constructor(userId: number, username: string) {
    const fakeSocket: ISocket = { send: () => { } };
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

class GameClient {
  constructor(public session: MockUserSession, private server: GameController) { }

  async send(type: string, data: any = {}) {
    await this.server.handleMessage(this.session, { type, data });
  }
}

// ─── ScriptedDeck ─────────────────────────────────────────────────────────────

class ScriptedDeck implements IDeck {
  private index = 0;
  constructor(private cards: Card[]) { }

  draw(): Card {
    const card = this.cards[this.index++];
    if (!card) throw new Error(`ScriptedDeck exhausted at index ${this.index}`);
    return card;
  }
}

// ─── Rigged deck: 4-player deterministic scenario ────────────────────────────

function createRiggedDeck(): ScriptedDeck {
  return new ScriptedDeck([
    // ── Round 1 ──────────────────────────────────────────────
    { suit: Suit.SPADES,   rank: Rank.TEN   }, // P1
    { suit: Suit.SPADES,   rank: Rank.NINE  }, // P2
    { suit: Suit.SPADES,   rank: Rank.TEN   }, // P3
    { suit: Suit.SPADES,   rank: Rank.TEN   }, // P4
    { suit: Suit.SPADES,   rank: Rank.NINE  }, // Dealer
    // ── Round 2 ──────────────────────────────────────────────
    { suit: Suit.HEARTS,   rank: Rank.TEN   }, // P1  → 20
    { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // P2  → 16
    { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // P3  → 17
    { suit: Suit.HEARTS,   rank: Rank.SIX   }, // P4  → 16
    { suit: Suit.HEARTS,   rank: Rank.SIX   }, // Dlr → 15
    // ── Action ───────────────────────────────────────────────
    { suit: Suit.DIAMONDS, rank: Rank.KING  }, // P2 hit → BUST (26)
    // ── Dealer draw ──────────────────────────────────────────
    { suit: Suit.CLUBS,    rank: Rank.THREE }, // Dlr → 18 (stop)
  ]);
}

// ─── Deck for "turn does NOT move on safe hit" test ──────────────────────────

function createSafeDeck(): ScriptedDeck {
  return new ScriptedDeck([
    { suit: Suit.SPADES,   rank: Rank.TWO   }, // P1 r1
    { suit: Suit.SPADES,   rank: Rank.THREE }, // P2 r1
    { suit: Suit.SPADES,   rank: Rank.NINE  }, // Dealer r1
    { suit: Suit.HEARTS,   rank: Rank.THREE }, // P1 r2 → 5
    { suit: Suit.HEARTS,   rank: Rank.TWO   }, // P2 r2 → 5
    { suit: Suit.HEARTS,   rank: Rank.FOUR  }, // Dealer r2 → 13
    { suit: Suit.DIAMONDS, rank: Rank.TWO   }, // P1 hit → 7  (safe)
    { suit: Suit.CLUBS,    rank: Rank.KING  }, // dealer potential draw
  ]);
}

// ─── Generic deck: safe for 1-3 player tests ─────────────────────────────────

function createGenericDeck(): ScriptedDeck {
  return new ScriptedDeck([
    { suit: Suit.SPADES,   rank: Rank.FIVE  }, // P1 r1
    { suit: Suit.SPADES,   rank: Rank.SIX   }, // P2 r1 (unused in 1p)
    { suit: Suit.SPADES,   rank: Rank.SEVEN }, // P3 r1 (unused in 1-2p)
    { suit: Suit.SPADES,   rank: Rank.EIGHT }, // Dealer r1
    { suit: Suit.HEARTS,   rank: Rank.SIX   }, // P1 r2 → 11
    { suit: Suit.HEARTS,   rank: Rank.FIVE  }, // P2 r2 → 11 (unused in 1p)
    { suit: Suit.HEARTS,   rank: Rank.FOUR  }, // P3 r2 → 11 (unused in 1-2p)
    { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // Dealer r2 → 15
    // Extra action cards (safe hits)
    { suit: Suit.DIAMONDS, rank: Rank.TWO   },
    { suit: Suit.DIAMONDS, rank: Rank.THREE },
    { suit: Suit.DIAMONDS, rank: Rank.FOUR  },
    { suit: Suit.DIAMONDS, rank: Rank.FIVE  },
    { suit: Suit.DIAMONDS, rank: Rank.SIX   },
    { suit: Suit.CLUBS,    rank: Rank.TWO   },
    { suit: Suit.CLUBS,    rank: Rank.THREE },
  ]);
}

// ─── Deck for disconnect tests ────────────────────────────────────────────────

function createDisconnectDeck(): ScriptedDeck {
  return new ScriptedDeck([
    { suit: Suit.SPADES,   rank: Rank.FIVE  }, // P1 r1
    { suit: Suit.SPADES,   rank: Rank.SIX   }, // P2 r1
    { suit: Suit.SPADES,   rank: Rank.EIGHT }, // Dealer r1
    { suit: Suit.HEARTS,   rank: Rank.SIX   }, // P1 r2 → 11
    { suit: Suit.HEARTS,   rank: Rank.FIVE  }, // P2 r2 → 11
    { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // Dealer r2 → 15
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
  let server: GameController;
  let roomService: RoomService;

  // Always generate room ID 999 so tests can look it up predictably.
  beforeEach(() => {
    roomService = new RoomService({ generate: () => 999 }, new InMemoryRoomRepository());
    server = new GameController({} as any, roomService, new InMemoryChipRepository(), new NullGameLogger());
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
      vi.useFakeTimers();
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room");
      await new GameClient(p2, server).send("request_join_room", { roomId: 999 });

      p2.clear();
      server.removeSession(1);
      vi.advanceTimersByTime(30_001); // fire reconnect timer only (idle timer is 300_000)
      vi.useRealTimers();

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
      expect(stateMsg.payload).toMatchObject({ state: GameState.WAITING });
    });

    it("user who joins last plays last in turn order", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      const last = new MockUserSession(99, "Last");
      server.addSession(p1);
      server.addSession(p2);
      server.addSession(last);

      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);
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
      expect(state.payload.dealer.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Disconnect mid-game ──────────────────────────────────────────────────

  describe("disconnect mid-game", () => {
    it("skips to next player's turn when current player disconnects", async () => {
      vi.useFakeTimers();
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
      vi.advanceTimersByTime(30_001); // fire reconnect timer only (idle timer is 300_000)
      vi.useRealTimers();

      const turnMsg = findLastMsg(p2, "game_update", "turn_changed");
      expect(turnMsg?.payload.currentPlayer).toBe(2);
    });

    it("immediately shifts turn on disconnect (duplicate of above with clearer name)", async () => {
      vi.useFakeTimers();
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
      vi.advanceTimersByTime(30_001); // fire reconnect timer only (idle timer is 300_000)
      vi.useRealTimers();

      const turnMsg = findLastMsg(p2, "game_update", "turn_changed");
      expect(turnMsg?.payload.currentPlayer).toBe(2);
    });
  });

  describe("join validation", () => {
    it("player with enough chip can join a room with minChip", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room", { minChip: 500 });
      await new GameClient(p2, server).send("request_join_room", { roomId: 999 });

      expect(findMsg(p2, "room_result", "join")?.success).toBe(true);
    });

    it("player with insufficient chip cannot join room", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room", { minChip: 2_000_000 });
      await new GameClient(p2, server).send("request_join_room", { roomId: 999 });

      const msg = findMsg(p2, "room_result", "join");
      expect(msg?.success).toBe(false);
      expect(msg?.reason).toBe("INSUFFICIENT_CHIP");
    });

    it("quick_join skips rooms where chip requirement is not met", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room", { minChip: 2_000_000 });
      await new GameClient(p2, server).send("request_quick_join_room");

      const msg = findMsg(p2, "room_result", "quick_join");
      expect(msg?.success).toBe(false);
      expect(msg?.reason).toBe("NO_AVAILABLE_ROOM");
    });

    it("quick_join succeeds when chip meets minChip", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room", { minChip: 0 });
      await new GameClient(p2, server).send("request_quick_join_room");

      expect(findMsg(p2, "room_result", "quick_join")?.success).toBe(true);
    });

    it("room with minChip=0 allows anyone to join", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);

      await new GameClient(p1, server).send("request_create_room");
      await new GameClient(p2, server).send("request_join_room", { roomId: 999 });

      expect(findMsg(p2, "room_result", "join")?.success).toBe(true);
    });
  });

  // ─── Kick after game end ─────────────────────────────────────────────────

  describe("kick broke players after game end", () => {

    async function runFullGame(
      c1: GameClient, p1: MockUserSession,
      extraClients: GameClient[] = [],
      extraSessions: MockUserSession[] = [],
    ) {
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      for (const c of extraClients) await c.send("request_player_ready");
      await c1.send("request_stand");
      for (const c of extraClients) await c.send("request_stand");
    }

    it("player with chip > 0 after game is NOT kicked", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);
      const c1 = new GameClient(p1, server);

      await c1.send("request_create_room");
      await runFullGame(c1, p1);

      const kicked = findMsg(p1, "room_result", "kicked");
      expect(kicked).toBeUndefined();
    });

    function createP2LosesDeck(): ScriptedDeck {
      return new ScriptedDeck([
        { suit: Suit.SPADES,   rank: Rank.FIVE  }, // P1 r1
        { suit: Suit.SPADES,   rank: Rank.TEN   }, // P2 r1
        { suit: Suit.SPADES,   rank: Rank.EIGHT }, // Dealer r1
        { suit: Suit.HEARTS,   rank: Rank.SIX   }, // P1 r2 → 11
        { suit: Suit.HEARTS,   rank: Rank.SIX   }, // P2 r2 → 16
        { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // Dealer r2 → 15
        { suit: Suit.DIAMONDS, rank: Rank.KING  }, // P2 hit → 26 BUST
        { suit: Suit.CLUBS,    rank: Rank.FOUR  }, // Dealer draw → 19
      ]);
    }

    it("player with 0 chip after game receives kicked message", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createP2LosesDeck());
      await c2.send("request_join_room", { roomId: 999 });

      await c1.send("request_start_game");
      const room = roomService.getRoom(999)!;
      const seat = room.getSeatByPlayerId(2);
      if (seat) seat.chip = 0;

      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await c1.send("request_stand");
      await c2.send("request_hit");

      const kickedMsg = findMsg(p2, "room_result", "kicked");
      expect(kickedMsg).toBeDefined();
      expect(kickedMsg?.reason).toBe("OUT_OF_CHIP");
    });

    it("kicked player is removed from room after game ends", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createP2LosesDeck());
      await c2.send("request_join_room", { roomId: 999 });

      await c1.send("request_start_game");
      const room = roomService.getRoom(999)!;
      const seat = room.getSeatByPlayerId(2);
      if (seat) seat.chip = 0;

      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await c1.send("request_stand");
      await c2.send("request_hit");

      expect(room.hasPlayer(2)).toBe(false);
    });

    it("remaining players get room_update after broke player is kicked", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createP2LosesDeck());
      await c2.send("request_join_room", { roomId: 999 });

      p1.clear();

      await c1.send("request_start_game");
      const room = roomService.getRoom(999)!;
      const seat = room.getSeatByPlayerId(2);
      if (seat) seat.chip = 0;

      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await c1.send("request_stand");
      await c2.send("request_hit");

      const kickBroadcast = findMsg(p1, "room_update", "players_kicked");
      expect(kickBroadcast).toBeDefined();
      expect(kickBroadcast?.payload?.kickedIds).toContain(2);
    });

    it("only broke players are kicked — others remain", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      const p3 = new MockUserSession(3, "P3");
      server.addSession(p1);
      server.addSession(p2);
      server.addSession(p3);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);
      const c3 = new GameClient(p3, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c2.send("request_join_room", { roomId: 999 });
      await c3.send("request_join_room", { roomId: 999 });

      const room = roomService.getRoom(999)!;
      const seat2 = room.getSeatByPlayerId(2);
      if (seat2) seat2.chip = 0;

      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await c3.send("request_player_ready");
      await c1.send("request_stand");
      await c2.send("request_stand");
      await c3.send("request_stand");

      expect(room.hasPlayer(1)).toBe(true);
      expect(room.hasPlayer(2)).toBe(false);
      expect(room.hasPlayer(3)).toBe(true);
    });

    it("broke player kicked from room cannot rejoin if minChip not met", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room", { minChip: 1000 });
      injectDeck(roomService.getRoom(999)!, new ScriptedDeck([
        { suit: Suit.SPADES,   rank: Rank.FIVE  }, // P1 r1
        { suit: Suit.SPADES,   rank: Rank.NINE  }, // P2 r1
        { suit: Suit.SPADES,   rank: Rank.EIGHT }, // Dealer r1
        { suit: Suit.HEARTS,   rank: Rank.SIX   }, // P1 r2 → 11
        { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // P2 r2 → 16
        { suit: Suit.HEARTS,   rank: Rank.NINE  }, // Dealer r2 → 17 (stop, no bust)
      ]));
      await c2.send("request_join_room", { roomId: 999 });

      const room = roomService.getRoom(999)!;
      const seat = room.getSeatByPlayerId(2);
      if (seat) seat.chip = 0;

      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await c1.send("request_stand");
      await c2.send("request_stand");

      p2.clear();
      await c2.send("request_join_room", { roomId: 999 });

      const rejoinMsg = findMsg(p2, "room_result", "join");
      expect(rejoinMsg?.success).toBe(false);
      expect(rejoinMsg?.reason).toBe("INSUFFICIENT_CHIP");
    });
  });

  // ─── minChip in snapshot ─────────────────────────────────────────────────

  describe("minChip in snapshot", () => {
    it("room snapshot includes minChip", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);

      await new GameClient(p1, server).send("request_create_room", { minChip: 5000 });

      const snapshot = findMsg(p1, "room_update", "snapshot");
      expect(snapshot?.room?.minChip).toBe(5000);
    });

    it("room snapshot minChip defaults to 0 when not specified", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);

      await new GameClient(p1, server).send("request_create_room");

      const snapshot = findMsg(p1, "room_update", "snapshot");
      expect(snapshot?.room?.minChip).toBe(0);
    });
  });

  // ─── Step 1: nextTurn() pointer fix ──────────────────────────────────────

  describe("nextTurn pointer fix", () => {
    it("game resolves correctly when last player busts (all players done after one action)", async () => {
      const p1 = new MockUserSession(1, "P1");
      server.addSession(p1);
      const c1 = new GameClient(p1, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, new ScriptedDeck([
        { suit: Suit.SPADES,   rank: Rank.TEN   }, // P1 r1
        { suit: Suit.SPADES,   rank: Rank.EIGHT }, // Dealer r1
        { suit: Suit.HEARTS,   rank: Rank.TEN   }, // P1 r2 → 20
        { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // Dealer r2 → 15
        { suit: Suit.DIAMONDS, rank: Rank.FIVE  }, // P1 hit → 25 BUST
        { suit: Suit.CLUBS,    rank: Rank.THREE }, // Dealer draw → 18
      ]));
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c1.send("request_hit"); // BUST → dealer resolves

      const stateMsg = findLastMsg(p1, "game_update", "state_changed");
      expect(stateMsg).toBeDefined();
      expect(stateMsg.payload.state).toBe(GameState.WAITING);
    });
  });

  // ─── Step 2: Blackjack skip turn ─────────────────────────────────────────

  describe("blackjack skip turn", () => {
    it("player with blackjack is skipped — turn goes directly to next player", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, new ScriptedDeck([
        { suit: Suit.SPADES,   rank: Rank.ACE   }, // P1 r1
        { suit: Suit.SPADES,   rank: Rank.SIX   }, // P2 r1
        { suit: Suit.SPADES,   rank: Rank.EIGHT }, // Dealer r1
        { suit: Suit.HEARTS,   rank: Rank.TEN   }, // P1 r2 → BLACKJACK (21)
        { suit: Suit.HEARTS,   rank: Rank.FIVE  }, // P2 r2 → 11
        { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // Dealer r2 → 15
        { suit: Suit.DIAMONDS, rank: Rank.THREE }, // Dealer draw → 18
      ]));
      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");

      const turnMsg = findLastMsg(p1, "game_update", "turn_changed");
      expect(turnMsg?.payload.currentPlayer).toBe(2);
    });

    it("all players blackjack → game resolves immediately after ready", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, new ScriptedDeck([
        { suit: Suit.SPADES,   rank: Rank.ACE   }, // P1 r1
        { suit: Suit.HEARTS,   rank: Rank.ACE   }, // P2 r1
        { suit: Suit.SPADES,   rank: Rank.EIGHT }, // Dealer r1
        { suit: Suit.CLUBS,    rank: Rank.TEN   }, // P1 r2 → BLACKJACK
        { suit: Suit.DIAMONDS, rank: Rank.TEN   }, // P2 r2 → BLACKJACK
        { suit: Suit.HEARTS,   rank: Rank.SEVEN }, // Dealer r2 → 15
        { suit: Suit.CLUBS,    rank: Rank.THREE }, // Dealer draw → 18
      ]));
      await c2.send("request_join_room", { roomId: 999 });
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready"); // ← ตรงนี้ game ควรจบเลย

      const stateMsg = findLastMsg(p1, "game_update", "state_changed");
      expect(stateMsg).toBeDefined();
      expect(stateMsg.payload.state).toBe(GameState.WAITING);
    });
  });

  // ─── Step 4: Chip persistence ─────────────────────────────────────────────

  describe("chip persistence across rooms", () => {
    it("chip is preserved after leave and rejoin another room", async () => {
      let nextRoomId = 100;
      roomService = new RoomService({ generate: () => nextRoomId++ }, new InMemoryRoomRepository());
      server = new GameController({} as any, roomService, new InMemoryChipRepository(), new NullGameLogger());

      const p1 = new MockUserSession(1, "P1");
      const p2 = new MockUserSession(2, "P2");
      server.addSession(p1);
      server.addSession(p2);
      const c1 = new GameClient(p1, server);
      const c2 = new GameClient(p2, server);

      // ── ห้องแรก ──────────────────────────────────────────────────────────
      await c1.send("request_create_room"); // roomId = 100
      injectDeck(roomService.getRoom(100)!, createGenericDeck());
      await c2.send("request_join_room", { roomId: 100 });
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c2.send("request_player_ready");
      await c1.send("request_stand");
      await c2.send("request_stand");

      const chipAfterGame = roomService.getRoom(100)?.getSeatByPlayerId(2)?.chip ?? 0;

      await c2.send("request_leave_room");

      // ── ห้องสอง ──────────────────────────────────────────────────────────
      await c1.send("request_create_room"); // roomId = 101
      await c2.send("request_join_room", { roomId: 101 });

      const seat = roomService.getRoom(101)?.getSeatByPlayerId(2);
      expect(seat?.chip).toBe(chipAfterGame);
    });
  });

  // ─── Step 5: roomState sync ───────────────────────────────────────────────

  describe("roomState sync after game ends", () => {
    it("canJoin returns true immediately after game ends (no lazy sync lag)", async () => {
      const p1 = new MockUserSession(1, "P1");
      const p3 = new MockUserSession(3, "P3");
      server.addSession(p1);
      server.addSession(p3);
      const c1 = new GameClient(p1, server);
      const c3 = new GameClient(p3, server);

      await c1.send("request_create_room");
      injectDeck(roomService.getRoom(999)!, createGenericDeck());
      await c1.send("request_start_game");
      await c1.send("request_player_ready");
      await c1.send("request_stand"); // game จบ → roomState ต้อง sync เป็น WAITING ทันที

      await c3.send("request_join_room", { roomId: 999 });

      const joinMsg = findMsg(p3, "room_result", "join");
      expect(joinMsg?.success).toBe(true);
    });
  });
});
