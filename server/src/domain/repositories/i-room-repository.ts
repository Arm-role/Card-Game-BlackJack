import { Room } from "../entities/room.js";

export interface IRoomRepository {
  save(room: Room): void;
  findById(id: number): Room | undefined;
  findByPlayerId(playerId: number): Room | undefined;
  getAll(): Room[];
  delete(id: number): void;
}
