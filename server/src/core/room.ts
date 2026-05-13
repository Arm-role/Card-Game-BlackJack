import { ActionResult, GameResult, PlayerAction, RoomState, Seat } from "../shared/types.js";
import { GameSession } from "./game-session.js";
import { IDeck } from "./Deck.js";
import { SeatManager, MAX_PLAYERS } from "./seat-manager.js";
import { SwapManager, SwapRequest } from "./swap-manager.js";
import { RoomConfig } from "../service/room-service.js";
import { ROOM_IDLE_TIMEOUT_MS } from "../config/config.js";

export class Room {
  private minChip: number;
  private betAmount: number;

  private seatManager = new SeatManager();
  private swapManager = new SwapManager();
  private gameSession: GameSession | null = null;
  private readyPlayers: Set<number> = new Set();
  private roomState: RoomState = "WAITING";
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;

  public onIdleTimeout?: (roomId: number) => void;
  public onTurnTimeout?: (playerId: number, result: ActionResult) => void;

  constructor(private roomId: number, config: RoomConfig = { minChip: 0, betAmount: 100 }) {
    this.minChip = config.minChip;
    this.betAmount = config.betAmount;
    this.startIdleTimer();
  }

  private startIdleTimer(): void {
    this.clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      this._idleTimer = null;
      this.onIdleTimeout?.(this.roomId);
    }, ROOM_IDLE_TIMEOUT_MS);
  }

  private clearIdleTimer(): void {
    if (this._idleTimer !== null) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }

  public destroy(): void {
    this.clearIdleTimer();
    this.gameSession?.destroy();
  }

  public getRoomId() { return this.roomId; }

  // =====================================================
  // 1. Player & Seat Management
  // =====================================================

  public addPlayer(id: number, username: string, startingChip?: number): boolean {
    if (this.gameSession?.isPlaying()) return false;
    return this.seatManager.addPlayer(id, username, startingChip);
  }

  public removePlayer(playerId: number): {
    turnChanged: boolean;
    nextPlayerId?: number;
    hostChanged: boolean;
    newHostId?: number;
  } {
    const { hostChanged, newHostId } = this.seatManager.removePlayer(playerId);
    this.swapManager.clearRequestsOfPlayer(playerId);
    this.readyPlayers.delete(playerId);

    let turnChanged = false;
    let nextPlayerId: number | undefined;

    if (this.gameSession) {
      const result = this.gameSession.onPlayerLeave(playerId);
      turnChanged = result.turnChanged;
      nextPlayerId = result.nextPlayerId;
    }

    return { turnChanged, nextPlayerId, hostChanged, newHostId };
  }

  public getHostId(): number | undefined {
    return this.seatManager.getHostId();
  }

  public isHost(playerId: number): boolean {
    return this.seatManager.isHost(playerId);
  }

  public canJoin(chip: number): boolean {
    if (this.gameSession?.isPlaying()) return false;
    if (this.isFull()) return false;
    if (this.minChip > 0 && chip < this.minChip) return false;
    return true;
  }

  public kickBrokePlayers(ids?: number[]): number[] {
    const toRemove = ids ?? this.getPlayersWithZeroChip();
    const kicked: number[] = [];
    for (const id of toRemove) {
      this.seatManager.removePlayer(id);
      kicked.push(id);
    }
    return kicked;
  }

  // =====================================================
  // 2. Swap Requests
  // =====================================================

  public swapSeat(playerId: number, fromSeat: number, toSeat: number): boolean {
    if (this.gameSession?.isPlaying()) return false;
    return this.seatManager.swapSeat(playerId, fromSeat, toSeat);
  }

  public addSwapRequest(targetId: number, req: SwapRequest): boolean {
    if (this.gameSession?.isPlaying()) return false;
    return this.swapManager.addRequest(targetId, req);
  }

  public getSwapRequest(playerId: number) { return this.swapManager.getRequest(playerId); }
  public removeSwapRequest(playerId: number) { this.swapManager.removeRequest(playerId); }

  public resolveSwapRequest(playerId: number, accept: boolean): boolean {
    if (this.gameSession?.isPlaying()) {
      this.swapManager.removeRequest(playerId);
      return false;
    }
    const request = this.swapManager.getRequest(playerId);
    if (!request) return false;
    let success = false;
    if (accept) success = this.seatManager.swapSeat(request.fromPlayerId, request.fromSeat, request.toSeat);
    this.swapManager.removeRequest(playerId);
    return success;
  }

  public placeBets(): void {
    // getPlayerIds() returns only role="player" seats — dealer (BOT or user) is excluded
    for (const id of this.seatManager.getPlayerIds()) {
      this.seatManager.adjustChip(id, -this.betAmount);
    }
  }

  public settleBets(results: Array<{ playerId: number; result: GameResult }>): Map<number, number> {
    const chipAfter = new Map<number, number>();
    for (const { playerId, result } of results) {
      let payout = 0;
      if (result === "WIN") payout = this.betAmount * 2;
      if (result === "DRAW") payout = this.betAmount;
      const after = this.seatManager.adjustChip(playerId, payout);
      chipAfter.set(playerId, after);
    }
    return chipAfter;
  }

  public getPlayersWithZeroChip(): number[] {
    return this.seatManager.getPlayerIds().filter(id => {
      const seat = this.seatManager.getSeatByPlayerId(id);
      return seat && (seat.chip ?? 0) <= 0;
    });
  }

  // =====================================================
  // Game Flow
  // =====================================================

  public canStartGame(playerId: number): boolean {
    return this.seatManager.getPlayerCount() >= 1
      && this.seatManager.isHost(playerId);
  }

  public startGame(deck?: IDeck): boolean {
    if (this.gameSession?.isPlaying()) return false;
    this.clearIdleTimer();
    this.seatManager.ensureDealer();
    const playerIds = this.seatManager.getPlayerIds();
    const dealerId = this.seatManager.getDealerId()!;
    this.gameSession = new GameSession(playerIds, dealerId, deck);
    this.gameSession.onTurnTimeout = (playerId, result) => {
      if (result.gameEnded) {
        this.roomState = "WAITING";
        this.startIdleTimer();
      }
      this.onTurnTimeout?.(playerId, result);
    };
    this.readyPlayers.clear();
    this.roomState = "PLAYING";
    const result = this.gameSession.start();
    return result !== undefined;
  }

  // ─── Animation gate ────────────────────────────────────────────────────────

  public setPlayerReady(playerId: number): boolean {
    if (!this.gameSession) return false;
    this.readyPlayers.add(playerId);
    const allReady = this.gameSession.markPlayerReady(playerId);
    // sync roomState กรณีเกมจบทันที (เช่น ทุกคน Blackjack)
    if (!this.gameSession.isPlaying()) {
      this.roomState = "WAITING";
      this.startIdleTimer();
    }
    return allReady;
  }

  // public isReadyToAct(): boolean {
  //   if (!(this.gameSession?.isReadyToAct() ?? false)) return false;
  //   return this.readyPlayers.size > 0;
  // }

  public isReadyToAct(): boolean {
    return this.gameSession?.isReadyToAct() ?? false;
  }

  public resetReadyState() {
    this.readyPlayers.clear();
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  public applyAction(playerId: number, action: PlayerAction): ActionResult | null {
    if (!this.gameSession) return null;
    const result = this.gameSession.applyAction(playerId, action) ?? null;
    // sync roomState ทันทีที่เกมจบ ไม่รอให้ getGameState() ถูกเรียก
    if (result?.gameEnded) {
      this.roomState = "WAITING";
      this.startIdleTimer();
    }
    return result;
  }

  public isPlayerTurn(playerId: number): boolean {
    return this.gameSession?.isPlayerTurn(playerId) ?? false;
  }

  // =====================================================
  // 4. Getters & Snapshots
  // =====================================================

  public getMinChip(): number { return this.minChip; }

  public getSeat(index: number) { return this.seatManager.getSeat(index); }
  public getSeatByPlayerId(playerId: number) { return this.seatManager.getSeatByPlayerId(playerId); }
  public getPlayerIds() { return this.seatManager.getPlayerIds(); }
  public hasPlayer(playerId: number) { return this.seatManager.hasPlayer(playerId); }
  public isFull() { return this.seatManager.isFull(); }
  public getCurrentPlayerId(): number | undefined { return this.gameSession?.getCurrentPlayerId(); }

  public getPlayerScore(playerId: number): number {
    return this.gameSession?.getPlayerScore(playerId) ?? 0;
  }

  public getSnapshot() {
    return {
      roomId: this.roomId,
      hostId: this.seatManager.getHostId(),
      minChip: this.minChip,
      betAmount: this.betAmount,
      max_player_count: MAX_PLAYERS,
      player_count: this.seatManager.getPlayerCount(),
      user_count: this.seatManager.getUserCount(),
      state: this.roomState,
      seats: this.seatManager.getAllSeats().map((s: Seat) => ({
        seatIndex: s.seatIndex,
        role: s.role,
        playerId: s.playerId ?? 0,
        username: s.username ?? "",
        chip: s.chip ?? 0,
      })),
    };
  }

  public getGameState() {
    if (!this.gameSession) return undefined;
    return this.gameSession.getGameSnapshot();
  }
}