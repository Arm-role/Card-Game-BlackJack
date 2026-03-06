import { IRoomIdGenerator } from "../models/interface";
import { Room } from "../core/room";

export class RoomService {
  private rooms: Map<string, Room> = new Map();
   private idGenerator: IRoomIdGenerator;

  constructor(idGenerator: IRoomIdGenerator) {
    this.idGenerator = idGenerator;
  }
  // =========================================================
  // Create
  // =========================================================

  public createRoom(): Room {
    let roomId: string;

    do {
      roomId = this.idGenerator.generate();
    } while (this.rooms.has(roomId));

    const room = new Room(roomId);

    this.rooms.set(roomId, room);

    return room;
  }

  // =========================================================
  // Get
  // =========================================================

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // =========================================================
  // Join Helpers
  // =========================================================

  public quickJoin(): Room | null {
    for (const room of this.rooms.values()) {
      if (!room.isFull()) {
        return room;
      }
    }

    return null;
  }

  public findRoomByPlayer(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(playerId)) {
        return room;
      }
    }

    return undefined;
  }

  // =========================================================
  // Delete
  // =========================================================

  public deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }
}