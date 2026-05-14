import { IAuthService } from "../../ports/i-auth-service.js";
import { RoomService } from "../../../service/room-service.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";
import { IGameLogger } from "../../../domain/logging/i-game-logger.js";
import { RECONNECT_TIMEOUT_MS } from "../../../config/config.js";

export class LoginUseCase {
  constructor(
    private readonly authService: IAuthService,
    private readonly roomService: RoomService,
    private readonly sessions: Map<number, UserSession>,
    private readonly reconnectTimers: Map<number, ReturnType<typeof setTimeout>>,
    private readonly logger: IGameLogger,
  ) {}

  async execute(session: UserSession, data: unknown): Promise<void> {
    const { username, password } = (data ?? {}) as Record<string, unknown>;
    if (typeof username !== "string" || typeof password !== "string") {
      session.send({ type: "login_result", success: false, reason: "INVALID_INPUT" });
      return;
    }

    const account = await this.authService.login(username, password);
    if (!account) {
      this.logger.log({ timestamp: new Date(), level: "WARN", event: { kind: "auth_login", userId: 0, username, success: false } });
      session.send({ type: "login_result", success: false, reason: "INVALID_CREDENTIALS" });
      return;
    }

    session.bindUser(account.id, account.username);

    const pendingTimer = this.reconnectTimers.get(account.id);
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      this.reconnectTimers.delete(account.id);
      const room = this.roomService.findRoomByPlayer(account.id);
      if (room) {
        session.send({ type: "room_update", action: "snapshot", room: room.getSnapshot() });
        const gameState = room.getGameState();
        if (gameState) {
          session.send({ type: "game_update", action: "state_changed", payload: gameState });
        }
      }
    }

    this.sessions.set(account.id, session);
    this.logger.log({ timestamp: new Date(), level: "INFO", event: { kind: "auth_login", userId: account.id, username: account.username, success: true } });
    session.send({ type: "login_result", success: true, username: account.username });
  }

  startReconnectTimer(userId: number, onExpire: () => void): void {
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(userId);
      onExpire();
    }, RECONNECT_TIMEOUT_MS);
    this.reconnectTimers.set(userId, timer);
  }
}
