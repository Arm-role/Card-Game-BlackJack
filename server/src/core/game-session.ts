import { ActionResult, Card, GameEvent, GameResult, GameState, PlayerAction, PlayerStatus } from "../shared/types.js";
import { BlackjackGame } from "./BlackjackGame.js";
import { IDeck, Deck } from "./Deck.js";

export class GameSession {
  private state: GameState = "WAITING";
  private game: BlackjackGame;
  private players: number[];
  private readyPlayers: Set<number> = new Set();
  private turnOrder: number[] = [];
  private currentTurnIndex = 0;
  private actionTakenThisTurn = new Set<number>();

  constructor(playerIds: number[], deck?: IDeck) {
    this.players = [...playerIds];
    this.game = new BlackjackGame(deck ?? new Deck());
  }

  private dispatch(event: GameEvent, payload?: any): any {
    console.log(`[GameSession] state=${this.state} event=${event}`);
    switch (this.state) {
      case "WAITING": return this.handleWaiting(event);
      case "DEALING": return this.handleDealing(event, payload);
      case "PLAYER_TURN": return this.handlePlayerTurn(event, payload);
      case "DEALER_TURN": return this.handleDealerTurn(event);
      case "RESOLVING": return this.handleResolving(event);
    }
  }

  private handleWaiting(event: GameEvent) {
    if (event !== "START") return;
    this.game.startGame(this.players);
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
      return { type: "TURN", currentPlayer: this.getCurrentPlayerId() };
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
      return { card, status, turnChanged: false, gameEnded: false };
    }

    if (event === "STAND") {
      const { playerId } = payload;
      if (!this.isPlayerTurn(playerId)) return undefined;
      this.game.stand(playerId);
      const status = this.game.getStatus(playerId)!;
      return this.buildNextTurnResult({ status });
    }

    if (event === "NEXT_TURN") return payload as ActionResult;
  }

  private buildNextTurnResult(partial: { card?: Card; status: PlayerStatus }): ActionResult {
    this.nextTurn();
    this.actionTakenThisTurn.clear();

    if (this.isDealerTurn()) {
      this.state = "DEALER_TURN";
      this.game.playDealerTurn();
      this.state = "RESOLVING";
      const results = this.buildResults();
      this.state = "WAITING";
      return { ...partial, turnChanged: true, nextPlayerId: undefined, gameEnded: true, results };
    }
    return { ...partial, turnChanged: true, nextPlayerId: this.getCurrentPlayerId(), gameEnded: false };
  }

  private handleDealerTurn(event: GameEvent) {
    if (event !== "DEALER_PLAY") return;
    this.game.playDealerTurn();
    this.state = "RESOLVING";
    return this.dispatch("END");
  }

  private handleResolving(event: GameEvent) {
    if (event !== "END") return;
    this.state = "WAITING";
    return { type: "GAME_END", results: this.buildResults() };
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
    let attempts = 0;
    do {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      const id = this.getCurrentPlayerId();
      const status = id !== undefined ? this.game.getStatus(id) : undefined;
      if (status === "PLAYING") return;
      attempts++;
    } while (attempts < this.turnOrder.length);
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
    this.dispatch("PLAYER_READY", { playerId });
    return (this.state as GameState) === "PLAYER_TURN";
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

    const result = this.dispatch(action, { playerId });
    return result;
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
        hand: this.game.getDealerHand().cards,
        score: this.game.getDealerHand().getScore(),
      },
      results: this.state === "WAITING"
        ? this.buildResults()
        : undefined,
    };
  }
}