import { IRoomIdGenerator } from "../service/room-service.js";

export class RandomRoomIdGenerator implements IRoomIdGenerator {

  private lastId = 0;

  public generate(): number {
    this.lastId++;
    return this.lastId;
  }

}