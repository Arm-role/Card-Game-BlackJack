import { PlayerActionResult, RoomEvent, RoomState } from "../shared/types";
import { BlackjackGame } from "./BlackjackGame";
import { Deck } from "./Deck";
import { GameSession } from "./game-session";
import { SeatManager, MAX_PLAYERS } from "./SeatManager";
import { SwapManager, SwapRequest } from "./SwapManager";

export class Room {
  private seatManager = new SeatManager();
  private swapManager = new SwapManager();
  private gameSession: GameSession | null = null;
  private game: BlackjackGame | undefined = undefined;
  private playersReadyForAction: Set<number> = new Set();
  private currentTurnIndex = 0;
  private turnOrder: number[] = [];

  private roomState: RoomState = "WAITING";

  constructor(private roomId: number, private deck?: Deck) { }

  public getRoomId() {
    return this.roomId;
  }


  // =======================================================
  // 1. Player & Seat Management (หุ้มด้วยกฎของ Room)
  // =======================================================

  public addPlayer(id: number, username: string): boolean {
    if (this.gameSession?.isPlaying()) return false;
    return this.seatManager.addPlayer(id, username);
  }

  public removePlayer(playerId: number) {
    this.seatManager.removePlayer(playerId);
    this.swapManager.clearRequestsOfPlayer(playerId);

    if (this.gameSession) {
      this.gameSession.onPlayerLeave(playerId);
    }
    // 🔥 ลบออกจาก turn
    this.turnOrder = this.turnOrder.filter(id => id !== playerId);

    // ถ้าเป็น turn ของมัน → ข้าม
    if (this.getCurrentPlayerId() === playerId) {
      this.nextTurn();
    }
  }

  public swapSeat(playerId: number, fromSeat: number, toSeat: number): boolean {
    // กฎเหล็ก: ห้ามสลับที่นั่งเด็ดขาด ถ้าเกมแจกไพ่เริ่มไปแล้ว
    if (this.gameSession?.isPlaying()) return false;

    return this.seatManager.swapSeat(playerId, fromSeat, toSeat);
  }

  // =======================================================
  // 2. Swap Requests Management
  // =======================================================

  public addSwapRequest(targetId: number, req: SwapRequest): boolean {
    if (this.gameSession?.isPlaying()) return false;// ห้ามขอสลับตอนเล่น
    return this.swapManager.addRequest(targetId, req);
  }

  public getSwapRequest(playerId: number) {
    return this.swapManager.getRequest(playerId);
  }

  public resolveSwapRequest(playerId: number, accept: boolean): boolean {
    if (this.gameSession?.isPlaying()) {
      this.swapManager.removeRequest(playerId);
      return false;
    }

    const request = this.swapManager.getRequest(playerId);
    if (!request) return false;

    let success = false;
    if (accept) {
      success = this.seatManager.swapSeat(request.fromPlayerId, request.fromSeat, request.toSeat);
    }

    this.swapManager.removeRequest(playerId);
    return success;
  }

  public removeSwapRequest(playerId: number) {
    this.swapManager.removeRequest(playerId);
  }

  // =======================================================
  // 3. Game Flow Control
  // =======================================================

  public canStartGame(): boolean {
    // ต้องมีผู้เล่นอย่างน้อย 1-2 คน (ขึ้นอยู่กับดีไซน์ ถ้าเล่นกับบอท 1 คนก็พอ)
    return this.seatManager.getPlayerCount() >= 1;
  }

   public startGame() {
    if (this.gameSession?.isPlaying()) return false;

    const players = this.seatManager.getPlayerIds();

    this.seatManager.ensureDealer();

    this.gameSession = new GameSession(
      players,
      new Deck()
    );

    return this.gameSession.start();
  }

  public playerHit(playerId: number) {
    if (!this.gameSession) return null;
    return this.gameSession.handleEvent("PLAYER_HIT", { playerId });
  }

  public playerStand(playerId: number) {
    if (!this.gameSession) return null;
    return this.gameSession.handleEvent("PLAYER_STAND", { playerId });
  }

  public playerReady(playerId: number) {
    if (!this.gameSession) return null;
    return this.gameSession.handleEvent("PLAYER_READY", { playerId });
  }

  // เช็คว่าทุกคนพร้อมหรือยัง (หรือเช็คเฉพาะคนที่มีสิทธิ์เล่น)
  public isReadyToAct(): boolean {
    const activePlayers = this.seatManager.getPlayerIds();
    return activePlayers.every(id => this.playersReadyForAction.has(id));
  }

  public isPlayerReady(playerId: number): boolean {
    return this.playersReadyForAction.has(playerId);
  }

  // ใช้ตอนเริ่มเกม หรือจังหวะที่ต้องรอทุกคน
  public areAllPlayersReady(): boolean {
    return this.seatManager.getPlayerIds().every(id => this.playersReadyForAction.has(id));
  }

  // ใช้ล้างสถานะเมื่อมีการส่ง Message ชุดใหม่ที่ต้องรอ Animation
  public resetReadyState() {
    this.playersReadyForAction.clear();
  }

  public getCurrentPlayerId(): number | null {
    if (this.turnOrder.length === 0) return null;

    return this.turnOrder[this.currentTurnIndex] ?? null;
  }

  public isPlayerTurn(playerId: number): boolean {
    return this.gameSession?.isPlayerTurn(playerId);
  }

  public nextTurn() {
    if (this.turnOrder.length === 0) return;

    let attempts = 0;

    do {
      this.currentTurnIndex++;
      if (this.currentTurnIndex >= this.turnOrder.length) {
        this.currentTurnIndex = 0;
      }

      attempts++;

      const playerId = this.getCurrentPlayerId();
      if (playerId && this.isPlayerActive(playerId)) {
        return;
      }

    } while (attempts < this.turnOrder.length);

    this.forceEndGame();
  }

  public shouldMoveNextTurn(playerId: number): boolean {
    const status = this.game?.getStatus(playerId);

    return (
      status === "BUST" ||
      status === "STAND" ||
      status === "BLACKJACK"
    );
  }

  private isPlayerActive(playerId: number): boolean {
    const status = this.game?.getStatus(playerId);
    return status === "PLAYING";
  }

  // =======================================================
  // 4. Data Getters & Snapshots (ดึงข้อมูลให้ GameServer)
  // =======================================================

  public getSeat(index: number) { return this.seatManager.getSeat(index); }
  public getSeatByPlayerId(playerId: number) { return this.seatManager.getSeatByPlayerId(playerId); }
  public getPlayerIds() { return this.seatManager.getPlayerIds(); }
  public hasPlayer(playerId: number) { return this.seatManager.hasPlayer(playerId); }
  public isFull() { return this.seatManager.isFull(); }

  public getSnapshot() {
    return {
      roomId: this.roomId,
      max_player_count: MAX_PLAYERS,
      player_count: this.seatManager.getPlayerCount(),
      user_count: this.seatManager.getUserCount(),
      state: this.roomState,
      seats: this.seatManager.getAllSeats().map(s => ({
        seatIndex: s.seatIndex,
        role: s.role,
        playerId: s.playerId ?? 0,
        username: s.username ?? "",
        chip: s.chip ?? 0
      }))
    };
  }
  public getGameState() {
    if (!this.game) return null;

    const playerStates = this.seatManager.getPlayerIds().map(id => ({
      playerId: id,
      hand: this.game!.getHand(id)?.cards,
      score: this.game!.getHand(id)?.getScore(),
      status: this.game!.getStatus(id),
      result: this.game!.getResult(id)
    }));

    return {
      state: this.roomState,
      dealer: {
        hand: this.game.getDealerHand().cards,
        score: this.game.getDealerHand().getScore()
      },
      players: playerStates
    };
  }
  public getPlayerScore(id: number) {
    return this.game!.getHand(id)?.getScore();
  }
  private forceEndGame() {
    this.roomState = "WAITING";
  }
}