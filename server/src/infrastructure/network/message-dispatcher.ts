import { UserSession } from "./user-session.js";

export type Handler<T = any> = (
  session: UserSession,
  msg: T,
) => void | Promise<void>;

export class MessageDispatcher {
  private readonly handlers = new Map<string, Handler<any>>();

  public register<T>(type: string, handler: Handler<T>): void {
    this.handlers.set(type, handler);
  }

  public async dispatch(session: UserSession, raw: unknown): Promise<void> {
    if (!raw || typeof raw !== "object") return;
    const type = (raw as Record<string, unknown>).type;
    if (typeof type !== "string" || !type) return;
    const handler = this.handlers.get(type);
    if (handler) {
      await handler(session, raw);
    } else {
      console.warn(`[Dispatcher] No handler for type="${type}"`);
    }
  }

  public has(type: string): boolean { return this.handlers.has(type); }
  public unregister(type: string): void { this.handlers.delete(type); }
}
