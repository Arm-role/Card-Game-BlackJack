import { GameEvent, GameState } from "../shared/types";
import { BlackjackGame } from "./BlackjackGame";
import { Deck } from "./Deck";

export class GameSession {
  private state: GameState = "WAITING";

  private game: BlackjackGame;
  private players: number[];

  private readyPlayers: Set<number> = new Set();

  private turnOrder: number[] = [];
  private currentTurnIndex = 0;

  constructor(playerIds: number[]) {
    this.players = playerIds;
    this.game = new BlackjackGame(new Deck());
  }

  // =====================================================
  // FSM ENTRY
  // =====================================================

  public dispatch(event: GameEvent, payload?: any): any {
    // 🔥 debug (AAA สำคัญมาก)
    console.log(`[GameSession] ${this.state} -> ${event}`);

    switch (this.state) {
      case "WAITING":
        return this.handleWaiting(event);

      case "DEALING":
        return this.handleDealing(event, payload);

      case "PLAYER_TURN":
        return this.handlePlayerTurn(event, payload);

      case "DEALER_TURN":
        return this.handleDealerTurn(event);

      case "RESOLVING":
        return this.handleResolving(event);
    }
  }

  // =====================================================
  // STATE: WAITING
  // =====================================================

  private handleWaiting(event: GameEvent) {
    if (event !== "START") return;

    this.game.startGame(this.players);

    this.setupTurnOrder();
    this.readyPlayers.clear();

    this.state = "DEALING";

    return {
      type: "GAME_STARTED",
      players: this.players
    };
  }

  // =====================================================
  // STATE: DEALING
  // =====================================================

  private handleDealing(event: GameEvent, payload: any) {
    if (event === "PLAYER_READY") {
      this.readyPlayers.add(payload.playerId);

      if (this.allPlayersReady()) {
        return this.dispatch("ALL_READY");
      }
    }

    if (event === "ALL_READY") {
      this.state = "PLAYER_TURN";

      return {
        type: "TURN",
        currentPlayer: this.getCurrentPlayerId()
      };
    }
  }

  // =====================================================
  // STATE: PLAYER TURN
  // =====================================================

  private handlePlayerTurn(event: GameEvent, payload: any) {
    const playerId = payload?.playerId;

    if (!this.isPlayerTurn(playerId)) return;

    if (event === "HIT") {
      const card = this.game.hit(playerId);
      const status = this.game.getStatus(playerId);

      if (this.shouldMoveNext(playerId)) {
        return this.dispatch("NEXT_TURN");
      }

      return {
        type: "PLAYER_HIT",
        playerId,
        card,
        status
      };
    }

    if (event === "STAND") {
      this.game.stand(playerId);
      return this.dispatch("NEXT_TURN");
    }

    if (event === "NEXT_TURN") {
      this.nextTurn();

      if (this.isDealerTurn()) {
        this.state = "DEALER_TURN";
        return this.dispatch("DEALER_PLAY");
      }

      return {
        type: "TURN",
        currentPlayer: this.getCurrentPlayerId()
      };
    }
  }

  // =====================================================
  // STATE: DEALER TURN
  // =====================================================

  private handleDealerTurn(event: GameEvent) {
    if (event !== "DEALER_PLAY") return;

    // 🔥 ใช้ logic จาก BlackjackGame
    // dealer จะเล่นอัตโนมัติอยู่แล้ว
    while (this.game.getDealerHand().getScore() < 17) {
      this.game.getDealerHand().addCard(this.game["deck"].draw());
    }

    this.state = "RESOLVING";

    return this.dispatch("END");
  }

  // =====================================================
  // STATE: RESOLVING
  // =====================================================

  private handleResolving(event: GameEvent) {
    if (event !== "END") return;

    this.state = "WAITING";

    return {
      type: "GAME_END",
      results: this.players.map(id => ({
        playerId: id,
        result: this.game.getResult(id)
      }))
    };
  }

  // =====================================================
  // TURN SYSTEM
  // =====================================================

  private setupTurnOrder() {
    this.turnOrder = [...this.players];
    this.currentTurnIndex = 0;
  }

  public getCurrentPlayerId(): number {
    return this.turnOrder[this.currentTurnIndex];
  }

  public isPlayerTurn(playerId: number): boolean {
    return this.getCurrentPlayerId() === playerId;
  }

  private nextTurn() {
    let attempts = 0;

    do {
      this.currentTurnIndex =
        (this.currentTurnIndex + 1) % this.turnOrder.length;

      const id = this.getCurrentPlayerId();
      const status = this.game.getStatus(id);

      if (status === "PLAYING") return;

      attempts++;
    } while (attempts < this.turnOrder.length);

    // ไม่มีคนเล่นแล้ว → dealer
    this.state = "DEALER_TURN";
  }

  private isDealerTurn(): boolean {
    return this.turnOrder.every(id => {
      const status = this.game.getStatus(id);
      return status !== "PLAYING";
    });
  }

  private shouldMoveNext(playerId: number): boolean {
    const status = this.game.getStatus(playerId);

    return (
      status === "BUST" ||
      status === "STAND" ||
      status === "BLACKJACK"
    );
  }

  private allPlayersReady(): boolean {
    return this.players.every(id => this.readyPlayers.has(id));
  }

  // =====================================================
  // PUBLIC API (ใช้จาก GameServer)
  // =====================================================

  public start() {
    return this.dispatch("START");
  }

  public playerReady(playerId: number) {
    return this.dispatch("PLAYER_READY", { playerId });
  }

  public hit(playerId: number) {
    return this.dispatch("HIT", { playerId });
  }

  public stand(playerId: number) {
    return this.dispatch("STAND", { playerId });
  }

  public getState() {
    return this.state;
  }

  public getGameSnapshot() {
    return {
      state: this.state,
      players: this.players.map(id => ({
        playerId: id,
        hand: this.game.getHand(id)?.cards,
        score: this.game.getHand(id)?.getScore(),
        status: this.game.getStatus(id),
        result: this.game.getResult(id)
      })),
      dealer: {
        hand: this.game.getDealerHand().cards,
        score: this.game.getDealerHand().getScore()
      }
    };
  }
}