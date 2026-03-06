type Handler = (data: any) => Promise<void> | void;

export class MessageDispatcher {
  private handlers: Map<string, Handler> = new Map();

  public register(type: string, handler: Handler) {
    this.handlers.set(type, handler);
  }

  public async dispatch(message: any) {
    const handler = this.handlers.get(message.type);

    if (!handler) {
      console.warn(`No handler for type: ${message.type}`);
      return;
    }

    await handler(message.data);
  }
}