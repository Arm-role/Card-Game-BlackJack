import { v4 as uuidv4 } from "uuid";

export interface ISocket {
  send(data: string): void;
}

export class UserSession {
  private sessionId: string;
  private userId?: number;
  private username?: string;

  constructor(private ws: ISocket) {
    this.sessionId = uuidv4();
  }

  public bindUser(accountId: number, username: string) {
    this.userId   = accountId;
    this.username = username;
  }

  public isAuthenticated(): boolean { return this.userId !== undefined; }
  public getUserId(): number | undefined { return this.userId; }
  public getUsername(): string | undefined { return this.username; }
  public getSessionId() { return this.sessionId; }

  public send(message: any) {
    try {
      this.ws.send(JSON.stringify(message));
    } catch {
      // WebSocket already closed — ignore
    }
  }
}
