export interface IEventPublisher {
  sendToPlayer(playerId: number, message: unknown): void;
  broadcastToPlayers(playerIds: number[], message: unknown): void;
}
