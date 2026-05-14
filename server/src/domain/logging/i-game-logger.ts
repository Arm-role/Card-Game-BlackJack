export type LogLevel = "INFO" | "WARN" | "SUSPICIOUS";

export type GameLogEvent =
  | { kind: "auth_login";    userId: number; username: string; success: boolean }
  | { kind: "auth_register"; username: string; success: boolean }
  | { kind: "chip_claim";    playerId: number; success: boolean; chipAfter?: number }
  | { kind: "game_hit";      playerId: number; roomId: number; card: string; score: number; status: string }
  | { kind: "game_stand";    playerId: number; roomId: number; isTimeout: boolean }
  | { kind: "game_result";   playerId: number; roomId: number; result: string; chipAfter: number }
  | { kind: "room_kick";     playerId: number; roomId: number; reason: string }
  | { kind: "suspicious";    playerId: number; roomId?: number; action: string; reason: string };

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  event: GameLogEvent;
}

export interface IGameLogger {
  log(entry: LogEntry): void;
}
