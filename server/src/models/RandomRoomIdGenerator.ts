import { IRoomIdGenerator } from "./interface";

export class RandomRoomIdGenerator implements IRoomIdGenerator {

 public generate(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

}