import { IAuthService } from "../../ports/i-auth-service.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";
import { IGameLogger } from "../../../domain/logging/i-game-logger.js";

export class RegisterUseCase {
  constructor(
    private readonly authService: IAuthService,
    private readonly sessions: Map<number, UserSession>,
    private readonly logger: IGameLogger,
  ) {}

  async execute(session: UserSession, data: unknown): Promise<void> {
    const { username, password } = (data ?? {}) as Record<string, unknown>;
    if (typeof username !== "string" || typeof password !== "string") {
      session.send({ type: "register_result", success: false, reason: "INVALID_INPUT" });
      return;
    }

    const account = await this.authService.register(username, password);
    if (!account) {
      this.logger.log({ timestamp: new Date(), level: "WARN", event: { kind: "auth_register", username, success: false } });
      session.send({ type: "register_result", success: false, reason: "USERNAME_EXISTS" });
      return;
    }

    session.bindUser(account.id, account.username);
    this.sessions.set(account.id, session);
    this.logger.log({ timestamp: new Date(), level: "INFO", event: { kind: "auth_register", username: account.username, success: true } });
    session.send({ type: "register_result", success: true, username: account.username });
  }
}
