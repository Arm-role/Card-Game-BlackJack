import { IEventPublisher } from "../../application/ports/i-event-publisher.js";
import { UserSession } from "./user-session.js";

export class WsEventPublisher implements IEventPublisher {
  constructor(private readonly sessions: Map<number, UserSession>) {}

  sendToPlayer(playerId: number, message: unknown): void {
    this.sessions.get(playerId)?.send(message);
  }

  broadcastToPlayers(playerIds: number[], message: unknown): void {
    for (const id of playerIds) {
      this.sessions.get(id)?.send(message);
    }
  }
}
