import { UserSession } from "./user-session";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A registered message handler.
 *  T is the full raw message shape (must include `type` string).
 *  Using `UserSession` directly keeps the dispatcher decoupled from any
 *  concrete WebSocket or auth layer.
 */
export type Handler<T = any> = (
  session: UserSession,
  msg: T,
) => void | Promise<void>;

// ─── MessageDispatcher ────────────────────────────────────────────────────────
//
// Single-responsibility: maps `msg.type` → handler.
// No game logic, no auth, no broadcasting — only routing.

export class MessageDispatcher {
  // Store as Handler<any> internally; callers get the correct T via register<T>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly handlers = new Map<string, Handler<any>>();

  /** Register a handler for the given message type.
   *  Calling register() twice for the same type overwrites the first. */
  public register<T>(type: string, handler: Handler<T>): void {
    this.handlers.set(type, handler);
  }

  /** Dispatch a raw message to its registered handler.
   *  Silently ignores messages with no `type` field.
   *  Logs a warning for unknown message types. */
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

  /** Returns true if a handler is registered for the given type. */
  public has(type: string): boolean {
    return this.handlers.has(type);
  }

  /** Remove a previously registered handler (useful in tests). */
  public unregister(type: string): void {
    this.handlers.delete(type);
  }
}