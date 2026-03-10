import { Board } from "./board";

const MAX_PLAYERS = 4;

class PlayerData {
  id: number;
  username: string;
  chip: number;
}

export class Room {
  private players = new Map<number, PlayerData>();
  private board = new Board();

  private roomId: number;

  constructor(roomId: number) {
    this.roomId = roomId;
  }

  public addPlayer(id: number, username: string): boolean {
    if (this.players.size >= MAX_PLAYERS) return false;

    this.players.set(id, { id, username, chip: 1000000 });
    return true;
  }

  public removePlayer(id: number) {
    this.players.delete(id);
  }

  public getPlayers() {
    return this.players;
  }

  public getRoomId(): number {
    return this.roomId;
  }

  public getMaxPlayerCount(): number {
    return MAX_PLAYERS;
  }

  public getPlayerIds(): number[] {
    return [...this.players.keys()];
  }

  public onPlayCard(playerId: string, cardId: string) {

  }

  public hasPlayer(id: number) {
    return this.players.has(id);
  }

  public isFull() {
    return this.players.size >= MAX_PLAYERS;
  }

  public getSnapshot() {
    const players = Array.from(this.players.values()).map(p => ({
      id: p.id,
      username: p.username,
      chip: p.chip
    }));

    return {
      roomId: this.roomId,
      max_player_count: MAX_PLAYERS,
      players
    };
  }
}
