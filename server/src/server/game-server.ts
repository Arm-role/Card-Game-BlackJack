import { UserSession } from "../core/user-session.js";
import { Room } from "../core/room.js";
import { MessageDispatcher } from "../core/dispatcher.js";
import { RoomService } from "../service/room-service.js";
import { STARTING_CHIPS, RECONNECT_TIMEOUT_MS } from "../config/config.js";
import { UserAccount } from "../service/auth-service.js";

import { createWriteStream, WriteStream } from "fs";

export interface IAuthService {
  register(username: string, password: string): Promise<UserAccount | undefined>;
  login(username: string, password: string): Promise<UserAccount | undefined>;
}

export class GameServer {
  private sessionsByUserId = new Map<number, UserSession>();
  private playerChips = new Map<number, number>();
  private dispatcher: MessageDispatcher;
  private logStream: WriteStream;
  private _reconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(private authService: IAuthService, private roomService: RoomService) {
    const logPath = process.cwd() + "/log.txt";
    console.log("[LOG PATH]", logPath);
    this.logStream = createWriteStream(logPath, { flags: "a" });
    this.dispatcher = new MessageDispatcher();
    this.registerHandlers();
  }

  private registerHandlers() {
    type Msg = { type: string; data: any };
    this.dispatcher.register<Msg>("request_register", (s, m) => this.handleRegister(s, m.data));
    this.dispatcher.register<Msg>("request_login", (s, m) => this.handleLogin(s, m.data));
    this.dispatcher.register<Msg>("request_create_room", (s, m) => this.handleCreateRoom(s, m.data));
    this.dispatcher.register<Msg>("request_join_room", (s, m) => this.handleJoinRoom(s, m.data));
    this.dispatcher.register<Msg>("request_swap_seat", (s, m) => this.handleSwapSeatRequest(s, m.data));
    this.dispatcher.register<Msg>("request_swap_response", (s, m) => this.handleSwapResponse(s, m.data));
    this.dispatcher.register<Msg>("request_quick_join_room", (s) => this.handleQuickJoin(s));
    this.dispatcher.register<Msg>("request_leave_room", (s) => this.handleLeaveRoom(s));
    this.dispatcher.register<Msg>("request_room_snapshot", (s) => this.handleSnapshotRequest(s));
    this.dispatcher.register<Msg>("request_start_game", (s) => this.handleStartGameRequest(s));
    this.dispatcher.register<Msg>("request_player_ready", (s) => this.handlePlayerReady(s));
    this.dispatcher.register<Msg>("request_hit", (s) => this.handlePlayerHit(s));
    this.dispatcher.register<Msg>("request_stand", (s) => this.handlePlayerStand(s));
  }

  public async handleMessage(session: UserSession, rawData: any) {
    await this.dispatcher.dispatch(session, rawData);
  }

  public addSession(session: UserSession) {
    const uid = session.getUserId();
    if (uid !== undefined) this.sessionsByUserId.set(uid, session);
  }

  public removeSession(userId: number) {
    const session = this.sessionsByUserId.get(userId);
    if (!session) return;

    if (!session.isAuthenticated()) {
      this.sessionsByUserId.delete(userId);
      return;
    }

    // รอ reconnect ก่อน — ถ้าไม่กลับมาภายใน RECONNECT_TIMEOUT_MS จึง kick จริง
    const timer = setTimeout(() => {
      this._reconnectTimers.delete(userId);
      this.handleDisconnect(session);
      this.sessionsByUserId.delete(userId);
    }, RECONNECT_TIMEOUT_MS);
    this._reconnectTimers.set(userId, timer);
  }

  private handleDisconnect(user: UserSession) {
    if (!user.isAuthenticated()) return;
    const playerId = user.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    // บันทึก chip ก่อน remove เพื่อ persist ข้าม session
    const chip = room.getSeatByPlayerId(playerId)?.chip;
    if (chip !== undefined) this.playerChips.set(playerId, chip);

    const { turnChanged, nextPlayerId, hostChanged, newHostId } =
      room.removePlayer(playerId);

    if (room.getPlayerIds().length === 0) {
      this.roomService.deleteRoom(room.getRoomId());
      return;
    }

    this.broadcastRoomUpdate(room);

    // แจ้ง host ใหม่
    if (hostChanged) {
      this.broadcastToRoom(room, {
        type: "room_update",
        action: "host_changed",
        payload: { hostId: newHostId ?? null },
      });
    }

    if (turnChanged) {
      this.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: { currentPlayer: nextPlayerId ?? null },
      });
    }
  }


  // =====================================================
  // Auth
  // =====================================================

  private async handleRegister(session: UserSession, data: any) {
    if (!data?.username || !data?.password) {
      session.send({ type: "register_result", success: false, reason: "INVALID_INPUT" });
      return;
    }
    const account = await this.authService.register(data.username, data.password);
    if (!account) {
      session.send({ type: "register_result", success: false, reason: "USERNAME_EXISTS" });
      return;
    }
    session.bindUser(account.id, account.username);
    this.sessionsByUserId.set(account.id, session);
    session.send({ type: "register_result", success: true, username: account.username });
  }

  private async handleLogin(session: UserSession, data: any) {
    if (!data?.username || !data?.password) {
      session.send({ type: "login_result", success: false, reason: "INVALID_INPUT" });
      return;
    }
    const account = await this.authService.login(data.username, data.password);
    if (!account) {
      session.send({ type: "login_result", success: false, reason: "INVALID_CREDENTIALS" });
      return;
    }
    session.bindUser(account.id, account.username);

    // ยกเลิก reconnect timer ถ้าผู้เล่นกลับมาทันเวลา
    const pendingTimer = this._reconnectTimers.get(account.id);
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      this._reconnectTimers.delete(account.id);
      // Re-sync สถานะห้องและเกมให้ client ใหม่
      const room = this.roomService.findRoomByPlayer(account.id);
      if (room) {
        session.send({ type: "room_update", action: "snapshot", room: room.getSnapshot() });
        const gameState = room.getGameState();
        if (gameState) {
          session.send({ type: "game_update", action: "state_changed", payload: gameState });
        }
      }
    }

    this.sessionsByUserId.set(account.id, session);
    session.send({ type: "login_result", success: true, username: account.username });
  }

  // =====================================================
  // Room management
  // =====================================================

  private setupRoomCallbacks(room: Room): void {
    room.onIdleTimeout = (roomId) => {
      this.broadcastToRoom(room, {
        type: "room_update",
        action: "room_closed",
        payload: { reason: "IDLE_TIMEOUT" },
      });
      room.destroy();
      this.roomService.deleteRoom(roomId);
    };

    room.onTurnTimeout = (playerId, result) => {
      this.broadcastToRoom(room, {
        type: "game_event",
        action: "player_stand",
        payload: { player_id: playerId, status: "STAND" },
      });
      if (result.turnChanged) {
        this.broadcastToRoom(room, {
          type: "game_update",
          action: "turn_changed",
          payload: { currentPlayer: result.nextPlayerId ?? null },
        });
      }
      if (result.gameEnded) {
        this.broadcastGameState(room);
      }
    };
  }

  private async handleCreateRoom(session: UserSession, data: any) {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "create", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }
    const minChip = typeof data?.minChip === "number" ? data.minChip : 0;
    const betAmount = typeof data?.betAmount === "number" ? data.betAmount : 100;
    const room = this.roomService.createRoom({ minChip, betAmount });
    this.setupRoomCallbacks(room);

    const playerId = session.getUserId()!;
    room.addPlayer(playerId, session.getUsername()!, this.getPlayerChip(playerId));

    session.send({
      type: "room_result", action: "create", success: true,
      seat: room.getSeatByPlayerId(playerId),
    });
    this.broadcastRoomUpdate(room);
  }

  private async handleJoinRoom(session: UserSession, data: any) {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "join", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }
    const room = this.roomService.getRoom(data?.roomId);
    if (!room) {
      session.send({ type: "room_result", action: "join", success: false, reason: "ROOM_NOT_FOUND" });
      return;
    }

    const playerId = session.getUserId()!;
    const chip = this.getPlayerChip(playerId);

    // canJoin ตรวจ: isFull + isPlaying + minChip
    if (!room.canJoin(chip)) {
      const reason = room.isFull() ? "ROOM_FULL" : "INSUFFICIENT_CHIP";
      session.send({ type: "room_result", action: "join", success: false, reason });
      return;
    }

    room.addPlayer(playerId, session.getUsername()!, chip);
    session.send({
      type: "room_result", action: "join", success: true,
      seat: room.getSeatByPlayerId(playerId),
    });
    this.broadcastRoomUpdate(room);
  }

  private async handleQuickJoin(session: UserSession) {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "quick_join", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }

    const playerId = session.getUserId()!;
    const chip = this.getPlayerChip(playerId);

    // หาห้องที่ chip ผ่านเกณฑ์
    const room = this.roomService.quickJoin(chip);
    if (!room) {
      session.send({ type: "room_result", action: "quick_join", success: false, reason: "NO_AVAILABLE_ROOM" });
      return;
    }

    room.addPlayer(playerId, session.getUsername()!, chip);
    session.send({
      type: "room_result", action: "quick_join", success: true,
      seat: room.getSeatByPlayerId(playerId),
    });
    this.broadcastRoomUpdate(room);
  }

  private async handleLeaveRoom(session: UserSession) {
    if (!session.isAuthenticated()) return;
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    // บันทึก chip ปัจจุบันก่อน remove เพื่อ persist ข้าม room
    const chip = room.getSeatByPlayerId(playerId)?.chip;
    if (chip !== undefined) this.playerChips.set(playerId, chip);

    room.removePlayer(playerId);
    session.send({ type: "room_result", action: "leave", success: true });
    if (room.getPlayerIds().length === 0) {
      this.roomService.deleteRoom(room.getRoomId());
    } else {
      this.broadcastRoomUpdate(room);
    }
  }

  private handleSnapshotRequest(session: UserSession) {
    if (!session.isAuthenticated()) return;
    const room = this.roomService.findRoomByPlayer(session.getUserId()!);
    if (!room) return;
    session.send({ type: "room_update", payload: room.getSnapshot() });
  }

  private handleSwapSeatRequest(session: UserSession, data: any) {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "ROOM_NOT_FOUND" });
      return;
    }
    const { fromSeat, toSeat } = data ?? {};
    if (fromSeat === undefined || toSeat === undefined) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "INVALID_INPUT" });
      return;
    }
    const from = room.getSeat(fromSeat);
    const to = room.getSeat(toSeat);
    if (!from || !to) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "INVALID_ROOM_SEAT" });
      return;
    }
    if (!to.playerId) {
      const success = room.swapSeat(playerId, fromSeat, toSeat);
      if (!success) {
        session.send({ type: "room_result", action: "swap_seat", success: false, reason: "SWAP_FAILED" });
        return;
      }
      this.broadcastRoomUpdate(room);
      return;
    }
    const targetPlayerId = to.playerId;
    room.addSwapRequest(targetPlayerId, { fromPlayerId: playerId, toPlayerId: targetPlayerId, fromSeat, toSeat });
    const targetSession = this.sessionsByUserId.get(targetPlayerId);
    if (targetSession) {
      targetSession.send({
        type: "room_update",
        action: "swap_request",
        success: true,
        seatSwap: { fromPlayerId: playerId, fromPlayerName: session.getUsername()!, fromSeat, toSeat },
      });
    }
    this.broadcastRoomUpdate(room);
  }

  private handleSwapResponse(session: UserSession, data: any) {
    if (!session.isAuthenticated()) return;
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;
    const request = room.getSwapRequest(playerId);
    if (!request) return;
    if (data?.accept) room.swapSeat(request.fromPlayerId, request.fromSeat, request.toSeat);
    room.removeSwapRequest(playerId);
    this.broadcastRoomUpdate(room);
  }

  // =====================================================
  // Game flow
  // =====================================================

  private handleStartGameRequest(session: UserSession) {
    if (!session.isAuthenticated()) {
      session.send({ type: "game_result", action: "start", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) {
      session.send({ type: "game_result", action: "start", success: false, reason: "ROOM_NOT_FOUND" });
      return;
    }
    if (!room.canStartGame(playerId)) {
      session.send({ type: "game_result", action: "start", success: false, reason: "NOT_HOST" });
      return;
    }
    room.startGame();
    room.placeBets();
    this.broadcastToRoom(room, { type: "game_update", action: "start", payload: { roomId: room.getRoomId() } });
    this.broadcastGameState(room);
  }

  private handlePlayerReady(session: UserSession) {
    if (!session.isAuthenticated()) return;
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    const allReady = room.setPlayerReady(playerId);

    if (allReady) {
      // ถ้าเกมจบแล้ว (ทุกคน blackjack) ให้ broadcast state แทน turn
      if (!room.isReadyToAct()) {
        this.broadcastGameState(room); // ← เพิ่มบรรทัดนี้
        return;
      }
      this.broadcastToRoom(room, { type: "game_update", action: "ready_to_act" });
      this.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: { currentPlayer: room.getCurrentPlayerId() },
      });
    }
  }

  private handlePlayerHit(session: UserSession) {
    if (!session.isAuthenticated()) {
      session.send({ type: "error", reason: "NOT_AUTHENTICATED" });
      return;
    }
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room || !room.isPlayerTurn(playerId)) {
      session.send({ type: "error", reason: "ROOM_UNDEFINED" });
      return;
    }
    if (!room.isReadyToAct()) {
      session.send({ type: "error", reason: "ANIMATION_IN_PROGRESS" });
      return;
    }

    const result = room.applyAction(playerId, "HIT");
    if (!result) {
      session.send({ type: "error", reason: "ACTION_UNDEFINED" });
      return;
    }

    // // Close per-action gate immediately — before any broadcast —
    // // so concurrent hits that arrive while we broadcast see the gate shut.
    // room.resetReadyState();

    this.broadcastToRoom(room, {
      type: "game_event",
      action: "player_hit",
      payload: {
        player_id: playerId,
        card: result.card,
        status: result.status,
        score: room.getPlayerScore(playerId),
      }
    });

    if (result.turnChanged) {
      this.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: { currentPlayer: result.nextPlayerId ?? null },
      });
    }

    if (result.gameEnded) {
      this.broadcastGameState(room);
    }

  }

  private handlePlayerStand(session: UserSession) {
    if (!session.isAuthenticated()) return;
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room || !room.isPlayerTurn(playerId)) {
      session.send({ type: "error", reason: "ROOM_UNDEFINED" });
      return;
    }
    if (!room.isReadyToAct()) {
      session.send({ type: "error", reason: "ANIMATION_IN_PROGRESS" });
      return;
    }

    const result = room.applyAction(playerId, "STAND");
    if (!result) {
      session.send({ type: "error", reason: "ACTION_UNDEFINED" });
      return;
    }

    // Close per-action gate before broadcast.
    // room.resetReadyState();

    this.broadcastToRoom(room, {
      type: "game_event",
      action: "player_stand",
      payload: { player_id: playerId, status: "STAND" },
    });

    if (result.turnChanged) {
      this.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: { currentPlayer: result.nextPlayerId ?? null },
      });
    }

    if (result.gameEnded) {
      this.broadcastGameState(room);
    }

  }

  // =====================================================
  // Broadcast helpers
  // =====================================================

  private broadcastGameState(room: Room) {
    const gameState = room.getGameState();
    if (!gameState) return;

    let chipAfter: Map<number, number> | undefined;
    if (gameState.state === "WAITING" && gameState.results) {
      chipAfter = room.settleBets(gameState.results);
    }

    const payload = chipAfter
      ? {
        ...gameState,
        results: gameState.results!.map(r => ({
          ...r,
          chipAfter: chipAfter!.get(r.playerId) ?? 0,
        })),
      }
      : gameState;

    this.broadcastToRoom(room, {
      type: "game_update", action: "state_changed", payload,
    });

    if (gameState.state === "WAITING") {
      this.kickBrokePlayersFromRoom(room);
    }
  }

  private broadcastRoomUpdate(room: Room) {
    this.broadcastToRoom(room, { type: "room_update", action: "snapshot", room: room.getSnapshot() });
  }

  private broadcastToRoom(room: Room, message: any) {
    this.log(`BROADCAST room=${room.getRoomId()}`, message);
    for (const id of room.getPlayerIds()) {
      this.sessionsByUserId.get(id)?.send(message);
    }
  }

  // =====================================================
  // Helper
  // =====================================================

  private getPlayerChip(playerId: number): number {
    // ── เพิ่ม: ถ้าเคย kick ไปแล้ว ใช้ค่าจาก map ──
    if (this.playerChips.has(playerId)) {
      return this.playerChips.get(playerId)!;
    }
    const room = this.roomService.findRoomByPlayer(playerId);
    if (room) return room.getSeatByPlayerId(playerId)?.chip ?? STARTING_CHIPS;
    return STARTING_CHIPS;
  }

  private kickBrokePlayersFromRoom(room: Room, toKick?: number[]) {
    const kickList = toKick ?? room.getPlayersWithZeroChip();
    if (kickList.length === 0) return;

    for (const kickedId of kickList) {
      this.playerChips.set(kickedId, 0);
    }

    for (const kickedId of kickList) {
      this.sessionsByUserId.get(kickedId)?.send({
        type: "room_result",
        action: "kicked",
        success: false,
        reason: "OUT_OF_CHIP",
      });
    }

    this.broadcastToRoom(room, {
      type: "room_update",
      action: "players_kicked",
      payload: { kickedIds: kickList, reason: "OUT_OF_CHIP" },
    });

    const kicked = room.kickBrokePlayers(kickList);
    for (const kickedId of kicked) {
      this.playerChips.set(kickedId, 0);
    }

    this.broadcastRoomUpdate(room);
  }


  private log(tag: string, message: any) {
    const { type, action, payload, reason } = message;
    const parts = [
      new Date().toISOString(),
      `[${tag}]`,
      `type=${type}`,
      action ? `action=${action}` : "",
      payload ? `payload=${JSON.stringify(payload)}` : "",
      reason ? `reason=${reason}` : "",
    ].filter(Boolean).join(" ");

    console.log(parts);
    this.logStream.write(parts + "\n");
  }
}