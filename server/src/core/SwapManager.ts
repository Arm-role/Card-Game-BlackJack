export type SwapRequest = {
  fromPlayerId: number;
  toPlayerId: number;
  fromSeat: number;
  toSeat: number;
};

export class SwapManager {
  private pendingSwaps = new Map<number, SwapRequest>();

  public addRequest(targetId: number, req: SwapRequest): boolean {
    if (this.pendingSwaps.has(targetId)) return false; // มีคำขอค้างอยู่แล้ว
    this.pendingSwaps.set(targetId, req);
    return true;
  }

  public getRequest(playerId: number) {
    return this.pendingSwaps.get(playerId);
  }

  public removeRequest(playerId: number) {
    this.pendingSwaps.delete(playerId);
  }

  public clearRequestsOfPlayer(playerId: number) {
    // ลบคำขอที่ส่งไปหาตัวเอง
    this.pendingSwaps.delete(playerId);

    // ลบคำขอที่ตัวเองเป็นคนส่งไปหาคนอื่น
    for (const [key, req] of this.pendingSwaps) {
      if (req.fromPlayerId === playerId) {
        this.pendingSwaps.delete(key);
      }
    }
  }
}