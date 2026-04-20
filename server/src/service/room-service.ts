import { Room } from "../core/room";

export interface IRoomIdGenerator {
  generate(): number;
}

export class RoomService {
  private rooms = new Map<number, Room>();

  constructor(private idGenerator: IRoomIdGenerator) {}

  public createRoom(): Room {
    const roomId = this.idGenerator.generate();
    const room   = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: number): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  public quickJoin(): Room | undefined {
    for (const room of this.rooms.values()) {
      if (!room.isFull()) return room;
    }
    return undefined;
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