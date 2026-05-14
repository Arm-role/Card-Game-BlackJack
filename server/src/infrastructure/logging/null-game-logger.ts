import { IGameLogger, LogEntry } from "../../domain/logging/i-game-logger.js";

export class NullGameLogger implements IGameLogger {
  log(_entry: LogEntry): void {}
}
