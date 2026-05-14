import { Room } from "../domain/entities/room.js";
import { IRoomRepository } from "../domain/repositories/i-room-repository.js";
import { IRoomIdGenerator } from "../domain/repositories/i-room-id-generator.js";

export interface RoomConfig {
  minChip: number;
  betAmount: number;
}

export class RoomService {
  constructor(
    private readonly idGenerator: IRoomIdGenerator,
    private readonly roomRepo: IRoomRepository,
  ) {}

  public createRoom(config: Partial<RoomConfig> = {}): Room {
    const fullConfig: RoomConfig = {
      minChip: config.minChip ?? 0,
      betAmount: config.betAmount ?? 100,
    };
    const roomId = this.idGenerator.generate();
    const room = new Room(roomId, fullConfig);
    this.roomRepo.save(room);
    return room;
  }

  public quickJoin(playerChip: number = 0): Room | undefined {
    for (const room of this.roomRepo.getAll()) {
      if (room.canJoin(playerChip)) return room;
    }
    return undefined;
  }

  public getRoom(roomId: number): Room | undefined {
    return this.roomRepo.findById(roomId);
  }

  public getAllRooms(): Room[] {
    return this.roomRepo.getAll();
  }

  public findRoomByPlayer(playerId: number): Room | undefined {
    return this.roomRepo.findByPlayerId(playerId);
  }

  public deleteRoom(roomId: number): void {
    this.roomRepo.delete(roomId);
  }
}
