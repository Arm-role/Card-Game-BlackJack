import { UserSession } from "./user-session";

type Handler<T> = (session: UserSession, message: T) => Promise<void> | void;

export class MessageDispatcher {
  private handlers = new Map<string, Handler<any>>();

  public register<T extends { type: string }>(
    type: T["type"],
    handler: Handler<T>
  ) {
    this.handlers.set(type, handler);
  }

  public async dispatch(session: UserSession, rawData: any) {
    try {

      let message;

      if (typeof rawData === "string" || rawData instanceof Buffer) {
        message = JSON.parse(rawData.toString());
      } else {
        message = rawData;
      }

      const handler = this.handlers.get(message.type);

      if (!handler) {
        console.error(`Unknown message type: ${message.type}`);
        return;
      }

      await handler(session, message);

    } catch (err) {
      console.error("Dispatch error:", err);
    }
  }
}