import { appendFileSync } from "fs";
import { IGameLogger, LogEntry } from "../../domain/logging/i-game-logger.js";

export class FileGameLogger implements IGameLogger {
  constructor(private readonly filePath: string) {}

  log(entry: LogEntry): void {
    const line = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      event: entry.event,
    });
    appendFileSync(this.filePath, line + "\n");
  }
}
