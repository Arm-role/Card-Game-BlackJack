import { ActionResult, Card, GameEvent, GameResult, GameState, PlayerAction, PlayerStatus } from "../types.js";
import { BlackjackGame } from "./blackjack-game.js";
import { Deck, IDeck } from "./deck.js";
import { TURN_TIMEOUT_MS } from "../../config/config.js";

export class GameSession {
  private state: GameState = GameState.WAITING;
  private game: BlackjackGame;
  private players: number[];
  private dealerId: number;
  private readyPlayers: Set<number> = new Set();
  private turnOrder: number[] = [];
  private currentTurnIndex = 0;
  private actionTakenThisTurn = new Set<number>();
  private _turnTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  public onTurnTimeout?: (playerId: number, result: ActionResult) => void;

  constructor(playerIds: number[], dealerId: number, deck?: IDeck) {
    this.players = [...playerIds];
    this.dealerId = dealerId;
    this.game = new BlackjackGame(deck ?? new Deck());
  }

  private dispatch(event: GameEvent, payload?: any): any {
    console.log(`[GameSession] state=${this.state} event=${event}`);
    switch (this.state) {
      case GameState.WAITING:     return this.handleWaiting(event);
      case GameState.DEALING:     return this.handleDealing(event, payload);
      case GameState.PLAYER_TURN: return this.handlePlayerTurn(event, payload);
    }
  }

  private handleWaiting(event: GameEvent) {
    if (event !== GameEvent.START) return;
    this.game.startGame(this.players, this.dealerId);
    this.setupTurnOrder();
    this.readyPlayers.clear();
    this.state = GameState.DEALING;
    return { type: "GAME_STARTED", players: this.players };
  }

  private handleDealing(event: GameEvent, payload: any) {
    if (event === GameEvent.PLAYER_READY) {
      this.readyPlayers.add(payload.playerId);
      if (this.allPlayersReady()) return this.dispatch(GameEvent.ALL_READY);
      return;
    }
    if (event === GameEvent.ALL_READY) {
      this.state = GameState.PLAYER_TURN;

      const firstId = this.getCurrentPlayerId();
      const firstStatus = firstId !== undefined ? this.game.getStatus(firstId) : undefined;
      if (firstStatus !== PlayerStatus.PLAYING) {
        if (this.isDealerTurn()) {
          this.game.playDealerTurn();
          const results = this.buildResults();
          this.state = GameState.WAITING;
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
    if (event === GameEvent.HIT) {
      const { playerId } = payload;
      if (!this.isPlayerTurn(playerId)) return undefined;

      const card = this.game.hit(playerId);
      const status = this.game.getStatus(playerId)!;
      if (!card) return undefined;

      if (status === PlayerStatus.BUST || status === PlayerStatus.STAND) {
        return this.buildNextTurnResult({ card, status });
      }

      this.actionTakenThisTurn.clear();
      this.startTurnTimer(playerId);
      return { card, status, turnChanged: false, gameEnded: false };
    }

    if (event === GameEvent.STAND) {
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
      this.game.playDealerTurn();
      const results = this.buildResults();
      this.state = GameState.WAITING;
      return { ...partial, turnChanged: true, nextPlayerId: undefined, gameEnded: true, results };
    }

    const nextId = this.getCurrentPlayerId();
    if (nextId !== undefined) this.startTurnTimer(nextId);
    return { ...partial, turnChanged: true, nextPlayerId: nextId, gameEnded: false };
  }

  private buildResults(): Array<{ playerId: number; result: GameResult }> {
    return this.players.map(id => ({ playerId: id, result: this.game.getResult(id) ?? GameResult.PENDING }));
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
      if (status === PlayerStatus.PLAYING) return;
      attempts++;
    } while (attempts < this.turnOrder.length);
    this.currentTurnIndex = startIndex;
  }

  private isDealerTurn(): boolean {
    return this.turnOrder.every(id => this.game.getStatus(id) !== PlayerStatus.PLAYING);
  }

  private allPlayersReady(): boolean {
    return this.players.every(id => this.readyPlayers.has(id));
  }

  public onPlayerLeave(playerId: number): { turnChanged: boolean; nextPlayerId?: number } {
    if (this.state !== GameState.PLAYER_TURN) {
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
      this.state = GameState.WAITING;
      return { turnChanged: true, nextPlayerId: undefined };
    }
    return { turnChanged: true, nextPlayerId: this.getCurrentPlayerId() };
  }

  public markPlayerReady(playerId: number): boolean {
    if (this.state !== GameState.DEALING) return false;
    const result = this.dispatch(GameEvent.PLAYER_READY, { playerId });
    return (this.state as GameState) === GameState.PLAYER_TURN || result?.type === "GAME_END";
  }

  public isReadyToAct(): boolean {
    return this.state === GameState.PLAYER_TURN;
  }

  public start() {
    return this.dispatch(GameEvent.START);
  }

  public applyAction(playerId: number, action: PlayerAction): ActionResult | undefined {
    if (this.state !== GameState.PLAYER_TURN) return undefined;
    if (!this.isPlayerTurn(playerId)) return undefined;
    if (action === PlayerAction.HIT && this.actionTakenThisTurn.has(playerId)) return undefined;
    if (action === PlayerAction.HIT) this.actionTakenThisTurn.add(playerId);
    this.clearTurnTimer();
    const result = this.dispatch(action as unknown as GameEvent, { playerId });
    return result;
  }

  private startTurnTimer(playerId: number): void {
    this.clearTurnTimer();
    this._turnTimer = setTimeout(() => {
      this._turnTimer = undefined;
      const result = this.applyAction(playerId, PlayerAction.STAND);
      if (result) this.onTurnTimeout?.(playerId, result);
    }, TURN_TIMEOUT_MS);
  }

  private clearTurnTimer(): void {
    if (this._turnTimer !== undefined) {
      clearTimeout(this._turnTimer);
      this._turnTimer = undefined;
    }
  }

  public destroy(): void { this.clearTurnTimer(); }
  public isPlaying(): boolean { return this.state !== GameState.WAITING; }
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
      results: this.state === GameState.WAITING ? this.buildResults() : undefined,
    };
  }
}
