import { IRoomRepository } from "../../domain/repositories/i-room-repository.js";
import { Room } from "../../domain/entities/room.js";

export class InMemoryRoomRepository implements IRoomRepository {
  private readonly rooms = new Map<number, Room>();

  save(room: Room): void {
    this.rooms.set(room.getRoomId(), room);
  }

  findById(id: number): Room | undefined {
    return this.rooms.get(id);
  }

  findByPlayerId(playerId: number): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(playerId)) return room;
    }
    return undefined;
  }

  getAll(): Room[] {
    return Array.from(this.rooms.values());
  }

  delete(id: number): void {
    this.rooms.delete(id);
  }
}
