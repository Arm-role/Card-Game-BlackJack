import { UserSession } from "../core/user-session";
import { RoomService } from "../service/room-service";
import { MessageDispatcher } from "../core/dispatcher";
import { AuthService } from "../service/auth-service";
import { Room } from "../core/room";

export class GameServer {
  private sessionsByUserId: Map<number, UserSession> = new Map();
  private dispatcher: MessageDispatcher;
  private authService: AuthService;
  private roomService: RoomService;

  constructor(authService: AuthService, roomService: RoomService) {
    this.authService = authService;
    this.roomService = roomService;

    this.dispatcher = new MessageDispatcher();
    this.registerHandlers();
  }

  private registerHandlers() {

    this.dispatcher.register<{ type: "request_register"; data: any }>(
      "request_register",
      async (session, msg) => {
        await this.handleRegister(session, msg.data);
      }
    );

    this.dispatcher.register<{ type: "request_login"; data: any }>(
      "request_login",
      async (session, msg) => {
        await this.handleLogin(session, msg.data);
      }
    );

    this.dispatcher.register<{ type: "request_create_room"; data: any }>(
      "request_create_room",
      async (session, msg) => {
        await this.handleCreateRoom(session, msg.data);
      });

    this.dispatcher.register<{ type: "request_join_room"; data: any }>(
      "request_join_room",
      async (session, msg) => {
        await this.handleJoinRoom(session, msg.data);
      }
    );

    this.dispatcher.register<{ type: "request_swap_seat", data: any }>(
      "request_swap_seat",
      async (session, msg) => {
        this.handleSwapSeatRequest(session, msg.data);
      }
    );

    this.dispatcher.register<{ type: "request_swap_response"; data: any }>(
      "request_swap_response",
      (session, msg) => {
        this.handleSwapResponse(session, msg.data);
      }
    );

    this.dispatcher.register("request_start_game", (session) => {
      this.handleStartGameRequest(session);
    });



    this.dispatcher.register("request_quick_join_room", async (session) => {
      await this.handleQuickJoin(session);
    });

    this.dispatcher.register("request_leave_room", async (session) => {
      await this.handleLeaveRoom(session);
    });

    this.dispatcher.register("request_room_snapshot", (session) => {
      this.handleSnapshotRequest(session);
    });


    this.dispatcher.register<{ type: "request_hit"; data: any }>(
      "request_hit",
      async (session, msg) => {
        this.handlePlayerHit(session);
      }
    );

    this.dispatcher.register<{ type: "request_stand"; data: any }>(
      "request_stand",
      async (session, msg) => {
        this.handlePlayerStand(session);
      }
    );

    this.dispatcher.register("request_player_ready", (session) => {
      this.handlePlayerReady(session);
    });
  }

  // =========================================================
  // Main Message Entry
  // =========================================================

  public async handleMessage(session: UserSession, rawData: any) {
    await this.dispatcher.dispatch(session, rawData);
  }

  // =========================
  // Session Management
  // =========================

  public addSession(session: UserSession): void {
    this.sessionsByUserId.set(session.getUserId(), session);
  }

  public removeSession(userId: number): void {
    const user = this.sessionsByUserId.get(userId);
    if (!user) return;

    this.handleDisconnect(user);
    this.sessionsByUserId.delete(userId);
  }

  private handleDisconnect(user: UserSession): void {
    if (!user.isAuthenticated()) return;

    const playerId = user.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room) return;

    room.removePlayer(playerId);

    if (room.getPlayerIds().length === 0) {
      this.roomService.deleteRoom(room.getRoomId());
    } else {
      this.broadcastRoomUpdate(room);
    }

    console.log(`User disconnected: ${user.getUserId()}`);
  }

  // =========================================================
  // Auth
  // =========================================================

  private async handleRegister(session: UserSession, data: any) {

    if (!data?.username || !data?.password) {
      session.send({
        type: "register_result",
        success: false,
        reason: "INVALID_INPUT"
      });
      return;
    }

    const account = await this.authService.register(
      data.username,
      data.password
    );

    if (!account) {
      session.send({
        type: "register_result",
        success: false,
        reason: "USERNAME_EXISTS"
      });
      return;
    }

    session.bindUser(account.id, account.username);
    this.sessionsByUserId.set(account.id, session);

    session.send({
      type: "register_result",
      success: true,
      username: account.username
    });
  }

  private async handleLogin(session: UserSession, data: any) {

    if (!data?.username || !data?.password) {
      session.send({
        type: "login_result",
        success: false,
        reason: "INVALID_INPUT"
      });
      return;
    }

    const account = await this.authService.login(
      data.username,
      data.password
    );

    if (!account) {
      session.send({
        type: "login_result",
        success: false,
        reason: "INVALID_CREDENTIALS"
      });
      return;
    }

    session.bindUser(account.id, account.username);
    this.sessionsByUserId.set(account.id, session);

    session.send({
      type: "login_result",
      success: true,
      username: account.username
    });
  }

  // =========================================================
  // Room
  // =========================================================

  private async handleCreateRoom(session: UserSession, data: any) {
    if (!session.isAuthenticated()) {
      session.send({
        type: "room_result",
        action: "create",
        success: false,
        reason: "NOT_AUTHENTICATED"
      });
      return;
    }

    const room = this.roomService.createRoom();
    if (!room) {
      session.send({ type: "room_result", action: "create", success: false });
      return;
    }

    room.addPlayer(
      session.getUserId()!,
      session.getUsername()!
    );

    session.send({
      type: "room_result",
      action: "create",
      success: true,
      seat: room.getSeatByPlayerId(session.getUserId())
    });

    this.broadcastRoomUpdate(room);
  }

  private async handleJoinRoom(session: UserSession, data: any) {
    if (!session.isAuthenticated()) {
      session.send({
        type: "room_result",
        action: "join",
        success: false,
        reason: "NOT_AUTHENTICATED"
      });
      return;
    }

    const room = this.roomService.getRoom(data?.roomId);

    if (!room) {
      session.send({
        type: "room_result",
        action: "join",
        success: false,
        reason: "ROOM_NOT_FOUND"
      });
      return;
    }

    if (room.isFull()) {
      session.send({
        type: "room_result",
        action: "join",
        success: false,
        reason: "ROOM_FULL"
      });
      return;
    }

    room.addPlayer(
      session.getUserId()!,
      session.getUsername()!
    );

    session.send({
      type: "room_result",
      action: "join",
      success: true,
      seat: room.getSeatByPlayerId(session.getUserId())
    });

    this.broadcastRoomUpdate(room);
  }

  private async handleQuickJoin(session: UserSession) {
    if (!session.isAuthenticated()) {
      session.send({
        type: "room_result",
        action: "quick_join",
        success: false,
        reason: "ROOM_NOT_FOUND"
      });
      return;
    }

    const room = this.roomService.quickJoin();
    if (!room) {
      session.send({
        type: "room_result",
        action: "quick_join",
        success: false,
        reason: "NO_AVAILABLE_ROOM"
      });
      return;
    }

    room.addPlayer(
      session.getUserId()!,
      session.getUsername()!
    );

    session.send({
      type: "room_result",
      action: "quick_join",
      success: true,
      seat: room.getSeatByPlayerId(session.getUserId())
    });

    this.broadcastRoomUpdate(room);
  }
  private async handleLeaveRoom(session: UserSession) {
    if (!session.isAuthenticated()) return;

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room) return;

    room.removePlayer(playerId);

    session.send({
      type: "room_result",
      action: "leave",
      success: true,
    });

    if (room.getPlayerIds().length === 0) {
      this.roomService.deleteRoom(room.getRoomId());
    } else {
      this.broadcastRoomUpdate(room);
    }
  }

  private handleSnapshotRequest(session: UserSession) {
    if (!session.isAuthenticated()) return;

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room) return;

    session.send({
      type: "room_update",
      payload: room.getSnapshot(),
    });
  }

  private handleSwapSeatRequest(session: UserSession, data: any) {

    if (!session.isAuthenticated()) {
      session.send({
        type: "room_result",
        action: "swap_seat",
        success: false,
        reason: "NOT_AUTHENTICATED"
      });
      return;
    }

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room) {
      session.send({
        type: "room_result",
        action: "swap_seat",
        success: false,
        reason: "ROOM_NOT_FOUND"
      });
      return;
    }

    const { fromSeat, toSeat } = data;

    if (fromSeat === undefined || toSeat === undefined) {
      session.send({
        type: "room_result",
        action: "swap_seat",
        success: false,
        reason: "INVALID_INPUT"
      });
      return;
    }

    const from = room.getSeat(fromSeat);
    const to = room.getSeat(toSeat);

    if (!from || !to) {
      session.send({
        type: "room_result",
        action: "swap_seat",
        success: false,
        reason: "INVALID_ROOM_SEAT"
      });
      return;
    }

    if (!to.playerId) {
      const success = room.swapSeat(playerId, fromSeat, toSeat);

      if (!success) {
        session.send({
          type: "room_result",
          action: "swap_seat",
          success: false,
          reason: "SWAP_FAILED"
        });
        return;
      }

      this.broadcastRoomUpdate(room);
      return;
    }

    const targetPlayerId = to.playerId;

    room.addSwapRequest(targetPlayerId, {
      fromPlayerId: playerId,
      toPlayerId: targetPlayerId,
      fromSeat,
      toSeat
    });

    const playerName = session.getUsername()!;

    const targetSession = this.sessionsByUserId.get(targetPlayerId);
    if (targetSession) {
      targetSession.send({
        type: "room_update",
        action: "swap_request",
        success: true,
        seatSwap: {
          fromPlayerId: playerId,
          fromPlayerName: playerName,
          fromSeat,
          toSeat
        }
      });
    }

    this.broadcastRoomUpdate(room);
  }

  private handleSwapResponse(session: UserSession, data: any) {

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    const request = room.getSwapRequest(playerId);
    if (!request) return;

    if (data.accept) {
      var success = room.swapSeat(request.fromPlayerId, request.fromSeat, request.toSeat);
      console.log(session);
    }

    room.removeSwapRequest(playerId);

    this.broadcastRoomUpdate(room);
  }

  private handleStartGameRequest(session: UserSession) {

    if (!session.isAuthenticated()) {
      session.send({
        type: "game_result",
        action: "start",
        success: false,
        reason: "NOT_AUTHENTICATED"
      });
      return;
    }

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room) {
      session.send({
        type: "game_result",
        action: "start",
        success: false,
        reason: "ROOM_NOT_FOUND"
      });
      return;
    }

    // check เงื่อนไข
    if (!room.canStartGame()) {
      session.send({
        type: "game_result",
        action: "start",
        success: false,
        reason: "NOT_ENOUGH_PLAYERS"
      });
      return;
    }
    // เริ่มเกม (คุณไป implement ต่อ)
    room.startGame();

    const message = {
      type: "game_update",
      action: "start",
      payload: {
        roomId: room.getRoomId()
      }
    };

    for (const id of room.getPlayerIds()) {
      const s = this.sessionsByUserId.get(id);
      if (!s) continue;

      s.send(message);
    }

    this.broadcastGameState(room);
  }

  // ---------------------------------------------------------
  // สร้างฟังก์ชัน Handler ด้านล่างของไฟล์
  // ---------------------------------------------------------

    private handlePlayerReady(session: UserSession) {
    if (!session.isAuthenticated()) return;
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room) return;

    room.setPlayerReady(playerId);

    // ถ้าทุกคนพร้อมแล้ว อาจจะส่ง Message บอก Client อีกรอบว่า "เริ่มเล่นได้!"
    if (room.isReadyToAct()) {
      this.broadcastToRoom(room, {
        type: "game_update",
        action: "ready_to_act" // ปลดล็อคปุ่มที่ Client
      });
    }
  }

  private handlePlayerHit(session: UserSession) {
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room || !room.isPlayerTurn(playerId)) {
      session.send({
        type: "error",
        reason: "ROOM_UNDEFINED"
      });
      return;
    }

    if (!room.isReadyToAct()) {
      session.send({
        type: "error",
        reason: "ANIMATION_IN_PROGRESS"
      });
      return;
    }

    const result = room.applyPlayerAction(playerId, "HIT");

    if (!result) {
      session.send({
        type: "error",
        reason: "ACTION_UNDIFINED"
      });
      return;
    }

    // 🎯 broadcast action
    this.broadcastToRoom(room, {
      type: "game_event",
      action: "player_hit",
      payload: result.card
    });

    // 🎯 turn change
    if (result.turnChanged) {
      this.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: {
          currentPlayer: result.nextPlayerId
        }
      });
    }

    // 🎯 game end
    if (result.gameEnded) {
      this.broadcastGameState(room);
    }

    room.resetReadyState();
  }

  private handlePlayerStand(session: UserSession) {
    if (!session.isAuthenticated()) return;
    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room || !room.isPlayerTurn(playerId)) {
      session.send({
        type: "error",
        reason: "ROOM_UNDEFINED"
      });
      return;
    }

    if (!room.isReadyToAct()) {
      session.send({
        type: "error",
        reason: "ANIMATION_IN_PROGRESS"
      });
      return;
    }

    // สั่งให้ Room ยิงคำสั่ง Stand ไปที่ Game Logic
    const result = room.applyPlayerAction(playerId, "STAND");

    if (!result) {
      session.send({
        type: "error",
        reason: "ACTION_UNDIFINED"
      });
      return;
    }


    // 🎯 broadcast action
    this.broadcastToRoom(room, {
      type: "game_event",
      aaction: "player_stand",
      payload: {
        player_id: playerId,
        status: "STAND"
      }
    });

    // 🎯 turn change
    if (result.turnChanged) {
      this.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: {
          currentPlayer: result.nextPlayerId
        }
      });
    }

    // 🎯 game end
    if (result.gameEnded) {
      this.broadcastGameState(room);
    }

    room.resetReadyState();
  }

  // =========================================================
  // Broadcasting
  // =========================================================

  private broadcastGameState(room: Room) {
    const gameState = room.getGameState();
    if (!gameState) return;

    const message = {
      type: "game_update",
      action: "state_changed",
      payload: gameState
    };

    this.broadcastToRoom(room, message);
  }


  private broadcastRoomUpdate(room: Room) {
    const message = {
      type: "room_update",
      action: "snapshot",
      room: room.getSnapshot()
    };

    this.broadcastToRoom(room, message);
  }

  private broadcastToRoom(room: Room, message: any) {
    for (const id of room.getPlayerIds()) {
      const s = this.sessionsByUserId.get(id);
      if (s) s.send(message);
    }
  }
}