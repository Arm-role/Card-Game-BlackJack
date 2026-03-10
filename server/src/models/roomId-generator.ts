import { IRoomIdGenerator } from "./interface";

export class RandomRoomIdGenerator implements IRoomIdGenerator {

  private lastId = 0;

  public generate(): number {
    this.lastId++;
    return this.lastId;
  }

}