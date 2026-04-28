import { Seat, SeatRole } from "../shared/types.js";

export const MAX_PLAYERS = 4;

export class SeatManager {
  private seats: Seat[] = [];

  constructor() {
    this.initSeats();
  }

  private initSeats() {
    this.seats = [
      { seatIndex: 0, role: "dealer" },
      ...Array.from({ length: MAX_PLAYERS }, (_, i) => ({
        seatIndex: i + 1,
        role: "player" as SeatRole,
      })),
    ];
  }

  public addPlayer(id: number, username: string): boolean {
    const seat = this.seats.find(s => s.role === "player" && !s.playerId);
    if (!seat) return false;
    seat.playerId = id;
    seat.username = username;
    seat.chip     = 1_000_000;
    return true;
  }

  public removePlayer(playerId: number) {
    for (const s of this.seats) {
      if (s.playerId === playerId) {
        s.playerId = undefined;
        s.username = undefined;
        s.chip     = undefined;
      }
    }
  }

  public swapSeat(playerId: number, fromSeat: number, toSeat: number): boolean {
    const from = this.getSeat(fromSeat);
    const to   = this.getSeat(toSeat);
    if (!from || !to) return false;
    if (from.playerId !== playerId) return false;

    [from.playerId, to.playerId] = [to.playerId, from.playerId];
    [from.username,  to.username]  = [to.username,  from.username];
    [from.chip,      to.chip]      = [to.chip,      from.chip];
    return true;
  }

  /** Assigns a BOT dealer if seat 0 is empty */
  public ensureDealer() {
    const dealer = this.seats[0];
    if (!dealer.playerId) {
      dealer.playerId = -1;
      dealer.username = "BOT";
      dealer.chip     = 999_999;
    }
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  public getSeat(index: number) { return this.seats[index]; }

  public getSeatByPlayerId(playerId: number) {
    return this.seats.find(s => s.playerId === playerId);
  }

  public hasPlayer(playerId: number): boolean {
    return this.seats.some(s => s.playerId === playerId);
  }

  public isFull(): boolean {
    return this.seats.filter(s => s.role === "player" && s.playerId).length >= MAX_PLAYERS;
  }

  /** All human player IDs (excludes BOT dealer -1) */
  public getPlayerIds(): number[] {
    return this.seats
      .filter(s => s.playerId && s.playerId !== -1)
      .map(s => s.playerId!);
  }

  /** Human players only (role === "player", not dealer seat) */
  public getPlayerCount(): number {
    return this.seats.filter(s => s.role === "player" && s.playerId && s.playerId !== -1).length;
  }

  /** All humans in room (includes human dealer if any) */
  public getUserCount(): number {
    return this.seats.filter(s => s.playerId && s.playerId !== -1).length;
  }

  public getAllSeats() { return this.seats; }
}