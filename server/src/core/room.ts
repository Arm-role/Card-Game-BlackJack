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

export class Room {
  private players = new Map<number, any>();
  private seats: Seat[] = [];
  private board = new Board();

  private roomId: number;
  private state: "WAITING" | "PLAYING" = "WAITING";

  constructor(roomId: number) {
    this.roomId = roomId;
    this.initializeSeats();
  }

  // =========================
  // Init
  // =========================

  private initializeSeats() {
    // Dealer
    this.seats.push({
      seatIndex: 0,
      role: "dealer"
    });

    // Players
    for (let i = 1; i <= 4; i++) {
      this.seats.push({
        seatIndex: i,
        role: "player"
      });
    }
  }

  // =========================
  // Player
  // =========================

  public addPlayer(id: number, username: string): boolean {
    if (this.players.size >= MAX_PLAYERS) return false;

    this.players.set(id, { id, username, chip: 1000000 });

    for (const seat of this.seats) {
      if (seat.role === "player" && !seat.playerId) {
        seat.playerId = id;
        seat.username = username;
        seat.chip = 1000000;
        break;
      }
    }

    return true;
  }

  public removePlayer(id: number) {
    this.players.delete(id);

    for (const seat of this.seats) {
      if (seat.playerId === id) {
        seat.playerId = undefined;
        seat.username = undefined;
        seat.chip = undefined;
      }
    }
  }

  public getPlayer(id: number) {
    return this.players.get(id);
  }

  public hasPlayer(id: number) {
    return this.players.has(id);
  }

  public getPlayerIds(): number[] {
    return [...this.players.keys()];
  }

  public isFull() {
    return this.players.size >= MAX_PLAYERS;
  }

  // =========================
  // Seat System
  // =========================

  public swapSeat(playerId: number, fromSeat: number, toSeat: number): boolean {
    const from = this.seats[fromSeat];
    const to = this.seats[toSeat];

    if (!from || !to) return false;

    // ต้องเป็นเจ้าของ seat
    if (from.playerId !== playerId) return false;

    // swap
    const temp = { ...to };

    this.seats[toSeat] = {
      ...from,
      seatIndex: toSeat
    };

    this.seats[fromSeat] = {
      ...temp,
      seatIndex: fromSeat
    };

    return true;
  }

  // =========================
  // Game Logic
  // =========================

  public canStartGame(): boolean {
    let playerCount = 0;

    for (const seat of this.seats) {
      if (seat.role === "player" && seat.playerId) {
        playerCount++;
      }
    }

    return playerCount >= 2;
  }

  public hasDealer(): boolean {
    const dealer = this.seats[0];
    return !!dealer.playerId;
  }

  public ensureDealer(): void {
    const dealer = this.seats[0];

    if (!dealer.playerId) {
      dealer.playerId = -1;
      dealer.username = "BOT";
      dealer.chip = 999999;
    }
  }

  public startGame(): void {
    this.state = "PLAYING";
  }

  // =========================
  // Snapshot
  // =========================

  public getSeatByPlayerId(playerId: number) {
    return this.seats.find(s => s.playerId === playerId);
  }

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

  public getRoomId(): number {
    return this.roomId;
  }
}
