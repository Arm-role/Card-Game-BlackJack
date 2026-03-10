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

    this.dispatcher.register<{ type: "register"; data: any }>(
      "register",
      async (session, msg) => {
        await this.handleRegister(session, msg.data);
      }
    );

    this.dispatcher.register<{ type: "login"; data: any }>(
      "login",
      async (session, msg) => {
        await this.handleLogin(session, msg.data);
      }
    );

    this.dispatcher.register<{ type: "join_room"; data: any }>(
      "join_room",
      async (session, msg) => {
        await this.handleJoinRoom(session, msg.data);
      }
    );

    this.dispatcher.register("create_room", async (session) => {
      await this.handleCreateRoom(session);
    });

    this.dispatcher.register("quick_join_room", async (session) => {
      await this.handleQuickJoin(session);
    });

    this.dispatcher.register("leave_room", async (session) => {
      await this.handleLeaveRoom(session);
    });

    this.dispatcher.register("request_room_snapshot", (session) => {
      this.handleSnapshotRequest(session);
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

  private async handleCreateRoom(session: UserSession) {
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

  // =========================================================
  // Broadcasting
  // =========================================================

  private broadcastRoomUpdate(room: Room) {
    const message = {
      type: "room_update",
      payload: room.getSnapshot(),
    };

    console.log(message);
    console.log(room.getPlayerIds().length);

    for (const playerId of room.getPlayerIds()) {
      const session = this.sessionsByUserId.get(playerId);
      console.log(playerId + " session : " + !session);

      if (!session) continue;

      session.send(message);
    }
  }
}