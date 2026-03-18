import { Board } from "./board";

const MAX_PLAYERS = 4;

type SeatRole = "dealer" | "player";

type Seat = {
  seatIndex: number;
  role: SeatRole;
  playerId?: number;
  username?: string;
  chip?: number;
};

type SwapRequest = {
  fromPlayerId: number;
  toPlayerId: number;
  fromSeat: number;
  toSeat: number;
};

export class Room {
  private seats: Seat[] = [];
  private pendingSwaps = new Map<number, {
    fromPlayerId: number;
    toPlayerId: number;
    fromSeat: number;
    toSeat: number;
  }>();

  private board = new Board();
  private state: "WAITING" | "PLAYING" = "WAITING";

  constructor(private roomId: number) {
    this.initSeats();
  }

  // =========================
  // Init
  // =========================

  private initSeats() {
    this.seats = [
      { seatIndex: 0, role: "dealer" },
      ...Array.from({ length: MAX_PLAYERS }, (_, i) => ({
        seatIndex: i + 1,
        role: "player" as SeatRole
      }))
    ];
  }

  // =========================
  // Player
  // =========================

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

    this.clearSwapRequestsOfPlayer(playerId);
  }

  public hasPlayer(playerId: number): boolean {
    return this.seats.some(s => s.playerId === playerId);
  }

  public getPlayerIds(): number[] {
    return this.seats
      .filter(s => s.playerId && s.playerId !== -1)
      .map(s => s.playerId!);
  }

  public isFull(): boolean {
    return this.seats.filter(s => s.role === "player" && s.playerId).length >= MAX_PLAYERS;
  }

  // =========================
  // Seat System
  // =========================

  public getSeat(index: number) {
    return this.seats[index];
  }

  public getSeatByPlayerId(playerId: number) {
    return this.seats.find(s => s.playerId === playerId);
  }

  public swapSeat(playerId: number, fromSeat: number, toSeat: number): boolean {
    const from = this.getSeat(fromSeat);
    const to = this.getSeat(toSeat);

    if (!from || !to) return false;
    if (from.playerId !== playerId) return false;

    [from.playerId, to.playerId] = [to.playerId, from.playerId];
    [from.username, to.username] = [to.username, from.username];
    [from.chip, to.chip] = [to.chip, from.chip];

    return true;
  }

  // =========================
  // Swap Request
  // =========================

  public addSwapRequest(targetId: number, req: SwapRequest): boolean {
    if (this.pendingSwaps.has(targetId)) return false;

    this.pendingSwaps.set(targetId, req);
    return true;
  }

  public getSwapRequest(playerId: number) {
    return this.pendingSwaps.get(playerId);
  }

  public removeSwapRequest(playerId: number) {
    this.pendingSwaps.delete(playerId);
  }

  public clearSwapRequestsOfPlayer(playerId: number) {
    this.pendingSwaps.delete(playerId);

    for (const [key, req] of this.pendingSwaps) {
      if (req.fromPlayerId === playerId) {
        this.pendingSwaps.delete(key);
      }
    }
  }

  // =========================
  // Game
  // =========================

  public canStartGame(): boolean {
    return this.seats.filter(s => s.role === "player" && s.playerId).length >= 2;
  }

  public ensureDealer() {
    const dealer = this.seats[0];

    if (!dealer.playerId) {
      dealer.playerId = -1;
      dealer.username = "BOT";
      dealer.chip = 999999;
    }
  }

  public hasDealer(): boolean {
    const dealer = this.seats[0];
    return !!dealer.playerId;
  }

  public startGame() {
    this.state = "PLAYING";
  }

  // =========================
  // Snapshot
  // =========================

  public getSnapshot() {
    return {
      roomId: this.roomId,
      max_player_count: MAX_PLAYERS,
      state: this.state,
      seats: this.seats.map(s => ({
        seatIndex: s.seatIndex,
        role: s.role,
        playerId: s.playerId ?? 0,
        username: s.username ?? "",
        chip: s.chip ?? 0
      }))
    };
  }

  // =========================
  // Getter
  // =========================

  public getRoomId() {
    return this.roomId;
  }
}