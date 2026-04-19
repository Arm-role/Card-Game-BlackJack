export const MAX_PLAYERS = 4;
export type SeatRole = "dealer" | "player";

export type Seat = {
  seatIndex: number;
  role: SeatRole;
  playerId?: number;
  username?: string;
  chip?: number;
};

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
        role: "player" as SeatRole
      }))
    ];
  }

  public addPlayer(id: number, username: string): boolean {
    const seat = this.seats.find(s => s.role === "player" && !s.playerId);
    if (!seat) return false;
    seat.playerId = id;
    seat.username = username;
    seat.chip = 1000000;
    return true;
  }

  public removePlayer(playerId: number) {
    this.seats.forEach(s => {
      if (s.playerId === playerId) {
        s.playerId = undefined;
        s.username = undefined;
        s.chip = undefined;
      }
    });
  }

  public swapSeat(playerId: number, fromSeat: number, toSeat: number): boolean {
    const from = this.getSeat(fromSeat);
    const to = this.getSeat(toSeat);

    if (!from || !to) return false;
    if (from.playerId !== playerId) return false;

    // สลับข้อมูลระหว่าง 2 ที่นั่ง
    [from.playerId, to.playerId] = [to.playerId, from.playerId];
    [from.username, to.username] = [to.username, from.username];
    [from.chip, to.chip] = [to.chip, from.chip];

    return true;
  }

  public ensureDealer() {
    const dealer = this.seats[0];
    if (!dealer.playerId) {
      dealer.playerId = -1;
      dealer.username = "BOT";
      dealer.chip = 999999;
    }
  }

  // --- Getters ---
  public getSeat(index: number) { return this.seats[index]; }
  public getSeatByPlayerId(playerId: number) { return this.seats.find(s => s.playerId === playerId); }
  public hasPlayer(playerId: number): boolean { return this.seats.some(s => s.playerId === playerId); }
  public isFull(): boolean { return this.seats.filter(s => s.role === "player" && s.playerId).length >= MAX_PLAYERS; }
  public getPlayerIds(): number[] { return this.seats.filter(s => s.playerId && s.playerId !== -1).map(s => s.playerId!); }
  public getPlayerCount(): number { return this.seats.filter(s => s.role === "player" && s.playerId && s.playerId !== -1).length; }
  public getUserCount(): number { return this.seats.filter(s => s.playerId && s.playerId !== -1).length; }
  public getAllSeats() { return this.seats; }
}