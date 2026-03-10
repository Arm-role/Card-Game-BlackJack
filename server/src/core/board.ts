// import { BlackJackBoardListener } from "../models/interface";

export class Board {
  private players: string[] = [];
  private currentTurnIndex = 0;
  // private listener: BlackJackBoardListener;

  // constructor(listener: BlackJackBoardListener) {
  //   this.listener = listener;
  // }

  public startGame(players: string[]) {
    this.players = players;
    // this.listener.onBoardBegin();
  }

  public playCard(playerId: string, cardId: string) {
    if (this.players[this.currentTurnIndex] !== playerId)
      return;

    return this.getState();
  }

  public nextTurn() {
    this.currentTurnIndex =
      (this.currentTurnIndex + 1) % this.players.length;
  }

  public getState() {
    return {
      currentTurn: this.players[this.currentTurnIndex]
    };
  }
}