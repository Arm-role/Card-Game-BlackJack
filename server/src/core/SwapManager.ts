export type SwapRequest = {
  fromPlayerId: number;
  toPlayerId: number;
  fromSeat: number;
  toSeat: number;
};

export class SwapManager {
  private pending = new Map<number, SwapRequest>();

  public addRequest(targetId: number, req: SwapRequest): boolean {
    if (this.pending.has(targetId)) return false; // already a pending request
    this.pending.set(targetId, req);
    return true;
  }

  public getRequest(playerId: number) {
    return this.pending.get(playerId);
  }

  public removeRequest(playerId: number) {
    this.pending.delete(playerId);
  }

  public clearRequestsOfPlayer(playerId: number) {
    this.pending.delete(playerId);
    for (const [key, req] of this.pending) {
      if (req.fromPlayerId === playerId) this.pending.delete(key);
    }
  }
}