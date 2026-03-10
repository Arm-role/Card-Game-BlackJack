import { IRoomIdGenerator } from "../models/interface";
import { Room } from "../core/room";

export class RoomService {
  private rooms: Map<number, Room> = new Map();
  private idGenerator: IRoomIdGenerator;

  constructor(idGenerator: IRoomIdGenerator) {
    this.idGenerator = idGenerator;
  }
  // =========================================================
  // Create
  // =========================================================

  public createRoom(): Room {
    let roomId: number;

    roomId = this.idGenerator.generate();
    const room = new Room(roomId);

    this.rooms.set(roomId, room);

    return room;
  }

  // =========================================================
  // Get
  // =========================================================

  public getRoom(roomId: number): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // =========================================================
  // Join Helpers
  // =========================================================

  public quickJoin(): Room | undefined {
    for (const room of this.rooms.values()) {
      if (!room.isFull()) {
        return room;
      }
    }

    return undefined;
  }

  public findRoomByPlayer(playerId: number): Room | undefined {
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

  public deleteRoom(roomId: number): void {
    this.rooms.delete(roomId);
  }
}