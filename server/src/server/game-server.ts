import { UserSession } from "../core/user-session";
import { RoomService } from "../service/room-service";
import { AuthService } from "../service/auth-service";
import { Room } from "../core/room";

export class GameServer {
  private sessionsBySessionId: Map<string, UserSession> = new Map();
  private sessionsByAccountId: Map<string, UserSession> = new Map();
  private authService: AuthService;
  private roomService: RoomService;

  constructor(authService : AuthService, roomService : RoomService)
  {
    this.authService = authService;
    this.roomService = roomService;
  }

  // =========================
  // Session Management
  // =========================

  public addSession(session: UserSession): void {
    this.sessionsBySessionId.set(session.getSessionId(), session);
  }

  public removeSession(sessionId: string): void {
    const session = this.sessionsBySessionId.get(sessionId);
    if (!session) return;

    this.handleDisconnect(session);
  }

  private handleDisconnect(session: UserSession): void {
    if (!session.isAuthenticated()) return;

    const playerId = session.getAccountId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room) return;

    room.removePlayer(playerId);

    if (room.getPlayerIds().length === 0) {
      this.roomService.deleteRoom(room.getRoomId());
    } else {
      this.broadcastRoomUpdate(room);
    }

    console.log(`Session disconnected: ${session.getSessionId()}`);
  }
  // =========================================================
  // Main Message Entry
  // =========================================================

  public async handleMessage(session: UserSession, message: any) {
    if (!message?.type) {
      session.send({ type: "error", message: "Invalid message format" });
      return;
    }

    console.log(message.type);

    switch (message.type) {
      case "register":
        await this.handleRegister(session, message.data);
        break;

      case "login":
        await this.handleLogin(session, message.data);
        break;

      case "create_room":
        await this.handleCreateRoom(session);
        break;

      case "join_room":
        await this.handleJoinRoom(session, message.data);
        break;

      case "quick_join_room":
        await this.handleQuickJoin(session);
        break;

      case "leave_room":
        await this.handleLeaveRoom(session);
        break;

      case "request_room_snapshot":
        this.handleSnapshotRequest(session);
        break;

      default:
        session.send({ type: "error", message: "Unknown message type" });
        break;
    }
  }

  // =========================================================
  // Auth
  // =========================================================

  private async handleRegister(session: UserSession, data: any) {
    if (!data?.username || !data?.password) {
      session.send({ type: "register_result", success: false });
      return;
    }

    const account = await this.authService.register(
      data.username,
      data.password
    );

    if (!account) {
      session.send({ type: "register_result", success: false });
      return;
    }

    session.bindAccount(account.id, account.username);
    this.sessionsByAccountId.set(account.id, session)
    session.send({
      type: "register_result",
      success: true,
      username: account.username,
    });
  }

  private async handleLogin(session: UserSession, data: any) {
    if (!data?.username || !data?.password) {
      session.send({ type: "login_result", success: false });
      return;
    }

    const account = await this.authService.login(
      data.username,
      data.password
    );

    if (!account) {
      session.send({ type: "login_result", success: false });
      return;
    }

    session.bindAccount(account.id, account.username);
    this.sessionsByAccountId.set(account.id, session)

    session.send({
      type: "login_result",
      success: true,
      username: account.username,
    });
  }

  // =========================================================
  // Room
  // =========================================================

  private async handleCreateRoom(session: UserSession) {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "create", success: false });
      return;
    }

    const room = this.roomService.createRoom();
    if (!room) {
      session.send({ type: "room_result", action: "create", success: false });
      return;
    }

    room.addPlayer(
      session.getAccountId()!,
      session.getDisplayName()!
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
      session.send({ type: "room_result", action: "join", success: false });
      return;
    }

    const room = this.roomService.getRoom(data?.roomId);
    if (!room || room.isFull()) {
      session.send({ type: "room_result", action: "join", success: false });
      return;
    }

    room.addPlayer(
      session.getAccountId()!,
      session.getDisplayName()!
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
      });
      return;
    }

    const room = this.roomService.quickJoin();
    if (!room) {
      session.send({
        type: "room_result",
        action: "quick_join",
        success: false,
      });
      return;
    }

    room.addPlayer(
      session.getAccountId()!,
      session.getDisplayName()!
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

    const playerId = session.getAccountId()!;
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

    const playerId = session.getAccountId()!;
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
      const session = this.sessionsByAccountId.get(playerId);
      console.log(playerId + " session : " + !session);

      if (!session) continue;

      session.send(message);
    }
  }
}