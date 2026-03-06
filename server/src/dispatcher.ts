type Handler<T> = (message: T) => Promise<void> | void;

export class MessageDispatcher {
  private handlers = new Map<string, Handler<any>>();

  public register<T extends { type: string }>(type: T["type"], handler: Handler<T>) {
    this.handlers.set(type, handler);
  }

  public async dispatch(rawData: any) {
    try {
      const json = rawData.toString();
      const message = JSON.parse(json);

      const handler = this.handlers.get(message.type);

      if (!handler) {
        console.error(`Unknown message type: ${message.type}`);
        return;
      }

      await handler(message);
    } catch (err) {
      console.error("Dispatch error:", err);
    }
  }
}
