import { IGameLogger, LogEntry, GameLogEvent, LogLevel } from "../../domain/logging/i-game-logger.js";

const COLORS: Record<LogLevel, string> = {
  INFO:       "\x1b[32m",
  WARN:       "\x1b[33m",
  SUSPICIOUS: "\x1b[31m",
};
const RESET = "\x1b[0m";

export class ConsoleGameLogger implements IGameLogger {
  log(entry: LogEntry): void {
    const ts    = entry.timestamp.toISOString();
    const color = COLORS[entry.level];
    const level = entry.level.padEnd(10);
    const msg   = format(entry.event);
    console.log(`${color}[${ts}] ${level} ${msg}${RESET}`);
  }
}

function format(e: GameLogEvent): string {
  switch (e.kind) {
    case "auth_login":
      return `auth_login     user=${e.username}(id=${e.userId}) success=${e.success}`;
    case "auth_register":
      return `auth_register  user=${e.username} success=${e.success}`;
    case "chip_claim":
      return `chip_claim     player=${e.playerId} success=${e.success}` +
             (e.chipAfter !== undefined ? ` chipAfter=${e.chipAfter}` : "");
    case "game_hit":
      return `game_hit       player=${e.playerId} room=${e.roomId} card=${e.card} score=${e.score} status=${e.status}`;
    case "game_stand":
      return `game_stand     player=${e.playerId} room=${e.roomId}` +
             (e.isTimeout ? " [TIMEOUT-AUTO-STAND]" : "");
    case "game_result":
      return `game_result    player=${e.playerId} room=${e.roomId} result=${e.result} chipAfter=${e.chipAfter}`;
    case "room_kick":
      return `room_kick      player=${e.playerId} room=${e.roomId} reason=${e.reason}`;
    case "suspicious":
      return `suspicious     player=${e.playerId}` +
             (e.roomId !== undefined ? ` room=${e.roomId}` : "") +
             ` action=${e.action} reason=${e.reason}`;
  }
}
