import { ActionResult, Card, GameEvent, GameResult, GameState, PlayerAction, PlayerStatus } from "../shared/types.js";
import { BlackjackGame } from "./blackjack-game.js";
import { Deck, IDeck } from "./Deck.js";
import { TURN_TIMEOUT_MS } from "../config/config.js";

export class GameSession {
  private state: GameState = "WAITING";
  private game: BlackjackGame;
  private players: number[];
  private dealerId: number;
  private readyPlayers: Set<number> = new Set();
  private turnOrder: number[] = [];
  private currentTurnIndex = 0;
  private actionTakenThisTurn = new Set<number>();
  private _turnTimer: ReturnType<typeof setTimeout> | null = null;
  public onTurnTimeout?: (playerId: number, result: ActionResult) => void;

  constructor(playerIds: number[], dealerId: number, deck?: IDeck) {
    this.players = [...playerIds];
    this.dealerId = dealerId;
    this.game = new BlackjackGame(deck ?? new Deck());
  }

  private dispatch(event: GameEvent, payload?: any): any {
    console.log(`[GameSession] state=${this.state} event=${event}`);
    switch (this.state) {
      case "WAITING": return this.handleWaiting(event);
      case "DEALING": return this.handleDealing(event, payload);
      case "PLAYER_TURN": return this.handlePlayerTurn(event, payload);
      // DEALER_TURN และ RESOLVING ถูก handle ภายใน buildNextTurnResult() โดยตรง
      // ไม่มี external event ที่ควร trigger state เหล่านี้จากภายนอก
    }
  }

  private handleWaiting(event: GameEvent) {
    if (event !== "START") return;
    this.game.startGame(this.players, this.dealerId);
    this.setupTurnOrder();
    this.readyPlayers.clear();
    this.state = "DEALING";
    return { type: "GAME_STARTED", players: this.players };
  }

  private handleDealing(event: GameEvent, payload: any) {
    if (event === "PLAYER_READY") {
      this.readyPlayers.add(payload.playerId);
      if (this.allPlayersReady()) return this.dispatch("ALL_READY");
      return;
    }
    if (event === "ALL_READY") {
      this.state = "PLAYER_TURN";

      const firstId = this.getCurrentPlayerId();
      const firstStatus = firstId !== undefined ? this.game.getStatus(firstId) : undefined;
      if (firstStatus !== "PLAYING") {
        if (this.isDealerTurn()) {
          this.game.playDealerTurn();
          const results = this.buildResults();
          this.state = "WAITING"; // ← ต้อง set ก่อน return
          return { type: "GAME_END", results };
        }
        this.nextTurn();
      }

      const currentId = this.getCurrentPlayerId();
      if (currentId !== undefined) this.startTurnTimer(currentId);
      return { type: "TURN", currentPlayer: currentId };
    }
  }

  private handlePlayerTurn(event: GameEvent, payload: any): ActionResult | undefined {
    if (event === "HIT") {
      const { playerId } = payload;
      if (!this.isPlayerTurn(playerId)) return undefined;

      const card = this.game.hit(playerId);
      const status = this.game.getStatus(playerId)!;
      if (!card) return undefined;

      if (status === "BUST") {
        return this.buildNextTurnResult({ card, status });
      }

      this.actionTakenThisTurn.clear();
      this.startTurnTimer(playerId);
      return { card, status, turnChanged: false, gameEnded: false };
    }

    if (event === "STAND") {
      const { playerId } = payload;
      if (!this.isPlayerTurn(playerId)) return undefined;
      this.game.stand(playerId);
      const status = this.game.getStatus(playerId)!;
      return this.buildNextTurnResult({ status });
    }
  }

  private buildNextTurnResult(partial: { card?: Card; status: PlayerStatus }): ActionResult {
    this.nextTurn();
    this.actionTakenThisTurn.clear();

    if (this.isDealerTurn()) {
      // dealer เล่นทันที — ไม่ต้องผ่าน FSM state เพิ่ม เพราะ sequential อยู่แล้ว
      this.game.playDealerTurn();
      const results = this.buildResults();
      this.state = "WAITING";
      return { ...partial, turnChanged: true, nextPlayerId: undefined, gameEnded: true, results };
    }

    const nextId = this.getCurrentPlayerId();
    if (nextId !== undefined) this.startTurnTimer(nextId);
    return { ...partial, turnChanged: true, nextPlayerId: nextId, gameEnded: false };
  }

  private buildResults(): Array<{ playerId: number; result: GameResult }> {
    return this.players.map(id => ({ playerId: id, result: this.game.getResult(id) ?? "PENDING" }));
  }

  private setupTurnOrder() {
    this.turnOrder = [...this.players];
    this.currentTurnIndex = 0;
  }

  public getCurrentPlayerId(): number | undefined {
    return this.turnOrder[this.currentTurnIndex];
  }

  public isPlayerTurn(playerId: number): boolean {
    return this.getCurrentPlayerId() === playerId;
  }

  private nextTurn() {
    const startIndex = this.currentTurnIndex;
    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      const id = this.getCurrentPlayerId();
      const status = id !== undefined ? this.game.getStatus(id) : undefined;
      if (status === "PLAYING") return;
      attempts++;
    } while (attempts < this.turnOrder.length);

    // ไม่มีใคร PLAYING เลย → คืน index เดิมไว้ให้ isDealerTurn() ตรวจจับต่อ
    this.currentTurnIndex = startIndex;
  }

  private isDealerTurn(): boolean {
    return this.turnOrder.every(id => this.game.getStatus(id) !== "PLAYING");
  }

  private shouldMoveNext(playerId: number): boolean {
    const s = this.game.getStatus(playerId);
    return s === "BUST" || s === "STAND" || s === "BLACKJACK";
  }

  private allPlayersReady(): boolean {
    return this.players.every(id => this.readyPlayers.has(id));
  }

  public onPlayerLeave(playerId: number): { turnChanged: boolean; nextPlayerId?: number } {
    if (this.state !== "PLAYER_TURN") {
      this.turnOrder = this.turnOrder.filter(id => id !== playerId);
      return { turnChanged: false };
    }
    const wasCurrentTurn = this.isPlayerTurn(playerId);
    const oldIndex = this.turnOrder.indexOf(playerId);
    this.turnOrder = this.turnOrder.filter(id => id !== playerId);
    if (!wasCurrentTurn) {
      if (oldIndex < this.currentTurnIndex) this.currentTurnIndex--;
      return { turnChanged: false };
    }
    if (this.currentTurnIndex >= this.turnOrder.length) this.currentTurnIndex = 0;
    if (this.turnOrder.length === 0 || this.isDealerTurn()) {
      this.game.playDealerTurn();
      this.state = "WAITING";
      return { turnChanged: true, nextPlayerId: undefined };
    }
    return { turnChanged: true, nextPlayerId: this.getCurrentPlayerId() };
  }

  public markPlayerReady(playerId: number): boolean {
    if (this.state !== "DEALING") return false;
    const result = this.dispatch("PLAYER_READY", { playerId });
    // state จะเป็น PLAYER_TURN (มีคนเล่น) หรือ WAITING (ทุกคน Blackjack → จบเลย)
    // ทั้งสองกรณีถือว่า "ready to proceed" → return true เพื่อให้ GameServer broadcast
    return (this.state as GameState) === "PLAYER_TURN" || result?.type === "GAME_END";
  }

  public isReadyToAct(): boolean {
    return (this.state as GameState) === "PLAYER_TURN";
  }

  public start() {
    return this.dispatch("START");
  }

  public applyAction(playerId: number, action: PlayerAction): ActionResult | undefined {
    if (this.state !== "PLAYER_TURN") return undefined;
    if (!this.isPlayerTurn(playerId)) return undefined;

    // HIT spam guard: ถ้า action = STAND ผ่านได้เสมอ
    // ถ้า action = HIT ใช้ Set กัน double-submit ในระดับ network frame เดียว
    if (action === "HIT" && this.actionTakenThisTurn.has(playerId)) return undefined;
    if (action === "HIT") this.actionTakenThisTurn.add(playerId);

    this.clearTurnTimer();
    const result = this.dispatch(action, { playerId });
    return result;
  }

  private startTurnTimer(playerId: number): void {
    this.clearTurnTimer();
    this._turnTimer = setTimeout(() => {
      this._turnTimer = null;
      const result = this.applyAction(playerId, "STAND");
      if (result) this.onTurnTimeout?.(playerId, result);
    }, TURN_TIMEOUT_MS);
  }

  private clearTurnTimer(): void {
    if (this._turnTimer !== null) {
      clearTimeout(this._turnTimer);
      this._turnTimer = null;
    }
  }

  public destroy(): void {
    this.clearTurnTimer();
  }

  public isPlaying(): boolean {
    return this.state !== "WAITING";
  }

  public getPlayerScore(playerId: number): number {
    return this.game.getHand(playerId)?.getScore() ?? 0;
  }

  public getGameSnapshot() {
    return {
      state: this.state,
      currentPlayer: this.getCurrentPlayerId(),
      players: this.players.map(id => ({
        playerId: id,
        hand: this.game.getHand(id)?.cards ?? [],
        score: this.game.getHand(id)?.getScore() ?? 0,
        status: this.game.getStatus(id),
        result: this.game.getResult(id),
      })),
      dealer: {
        dealerId: this.dealerId,
        hand: this.game.getDealerHand().cards,
        score: this.game.getDealerHand().getScore(),
      },
      results: this.state === "WAITING"
        ? this.buildResults()
        : undefined,
    };
  }
}