// RoomService.ts
import { Room } from "../core/room.js";

export interface RoomConfig {
  minChip: number;
  betAmount: number;
}

export interface IRoomIdGenerator {
  generate(): number;
}

export class RoomService {
  private rooms = new Map<number, Room>();

  constructor(private idGenerator: IRoomIdGenerator) { }

  public createRoom(config: Partial<RoomConfig> = {}): Room {
    const fullConfig: RoomConfig = {
      minChip: config.minChip ?? 0,
      betAmount: config.betAmount ?? 100,
    };
    const roomId = this.idGenerator.generate();
    const room = new Room(roomId, fullConfig);
    this.rooms.set(roomId, room);
    return room;
  }

  public quickJoin(playerChip: number = 0): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.canJoin(playerChip)) return room;
    }
    return undefined;
  }

  public getRoom(roomId: number): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  public findRoomByPlayer(playerId: number): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(playerId)) return room;
    }
    return undefined;
  }

  public deleteRoom(roomId: number) {
    this.rooms.delete(roomId);
  }
}