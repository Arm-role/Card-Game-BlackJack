import { IGameLogger, LogEntry } from "../../domain/logging/i-game-logger.js";

export class CompositeGameLogger implements IGameLogger {
  constructor(private readonly loggers: IGameLogger[]) {}

  log(entry: LogEntry): void {
    for (const logger of this.loggers) {
      logger.log(entry);
    }
  }
}
