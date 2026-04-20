import { ActionResult, PlayerAction, RoomState, Seat } from "../shared/types";
import { GameSession } from "./game-session";
import { IDeck } from "./Deck";
import { SeatManager, MAX_PLAYERS } from "./SeatManager";
import { SwapManager, SwapRequest } from "./SwapManager";

export class Room {
  private seatManager = new SeatManager();
  private swapManager = new SwapManager();
  private gameSession: GameSession | null = null;
  private readyPlayers: Set<number> = new Set();
  private roomState: RoomState = "WAITING";

  constructor(private roomId: number) {}

  public getRoomId() { return this.roomId; }

  // =====================================================
  // 1. Player & Seat Management
  // =====================================================

  public addPlayer(id: number, username: string): boolean {
    if (this.gameSession?.isPlaying()) return false;
    return this.seatManager.addPlayer(id, username);
  }

  public removePlayer(playerId: number): { turnChanged: boolean; nextPlayerId?: number } {
    this.seatManager.removePlayer(playerId);
    this.swapManager.clearRequestsOfPlayer(playerId);
    this.readyPlayers.delete(playerId);
    if (this.gameSession) return this.gameSession.onPlayerLeave(playerId);
    return { turnChanged: false };
  }

  public swapSeat(playerId: number, fromSeat: number, toSeat: number): boolean {
    if (this.gameSession?.isPlaying()) return false;
    return this.seatManager.swapSeat(playerId, fromSeat, toSeat);
  }

  // =====================================================
  // 2. Swap Requests
  // =====================================================

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

  // =====================================================
  // 3. Game Flow
  // =====================================================

  public canStartGame(): boolean {
    return this.seatManager.getPlayerCount() >= 1;
  }

  public startGame(deck?: IDeck): boolean {
    if (this.gameSession?.isPlaying()) return false;
    this.seatManager.ensureDealer();
    const playerIds = this.seatManager.getPlayerIds();
    this.gameSession = new GameSession(playerIds, deck);
    this.readyPlayers.clear();
    this.roomState = "PLAYING";
    const result = this.gameSession.start();
    return result !== undefined;
  }

  // ─── Animation gate ────────────────────────────────────────────────────────

  public setPlayerReady(playerId: number): boolean {
    if (!this.gameSession) return false;
    this.readyPlayers.add(playerId);
    return this.gameSession.markPlayerReady(playerId);
  }

  // Gate has two layers:
  //   1. GameSession must be in PLAYER_TURN state (FSM gate — open for whole turn)
  //   2. readyPlayers must be non-empty (per-action gate — reset after each action)
  public isReadyToAct(): boolean {
    if (!(this.gameSession?.isReadyToAct() ?? false)) return false;
    return this.readyPlayers.size > 0;
  }

  // Called by server immediately after accepting an action.
  // Closes the per-action gate so the next hit/stand must wait for a new ready signal.
  public resetReadyState() {
    this.readyPlayers.clear();
  }

  // Unlocks the synchronous action lock inside GameSession so the next player can act.
  public unlockAction() {
    this.gameSession?.unlockAction();
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  public applyAction(playerId: number, action: PlayerAction): ActionResult | null {
    if (!this.gameSession) return null;
    return this.gameSession.applyAction(playerId, action) ?? null;
  }

  public isPlayerTurn(playerId: number): boolean {
    return this.gameSession?.isPlayerTurn(playerId) ?? false;
  }

  // =====================================================
  // 4. Getters & Snapshots
  // =====================================================

  public getSeat(index: number) { return this.seatManager.getSeat(index); }
  public getSeatByPlayerId(playerId: number) { return this.seatManager.getSeatByPlayerId(playerId); }
  public getPlayerIds() { return this.seatManager.getPlayerIds(); }
  public hasPlayer(playerId: number) { return this.seatManager.hasPlayer(playerId); }
  public isFull() { return this.seatManager.isFull(); }
  public getCurrentPlayerId(): number | undefined { return this.gameSession?.getCurrentPlayerId(); }

  public getSnapshot() {
    return {
      roomId: this.roomId,
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
    if (!this.gameSession) return null;
    const snap = this.gameSession.getGameSnapshot();
    if (snap.state === "WAITING") this.roomState = "WAITING";
    return snap;
  }
}