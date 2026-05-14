import { WebSocketServer } from "ws";
import { UserSession } from "./infrastructure/network/user-session.js";
import { GameController } from "./interface-adapters/controllers/game-controller.js";
import { AuthService } from "./service/auth-service.js";
import { RoomService } from "./service/room-service.js";
import { RandomRoomIdGenerator } from "./infrastructure/persistence/room-id-generator.js";
import { MemoryUserRepository } from "./infrastructure/persistence/memory-user-repository.js";
import { InMemoryChipRepository } from "./infrastructure/persistence/in-memory-chip-repository.js";
import { InMemoryRoomRepository } from "./infrastructure/persistence/in-memory-room-repository.js";
import { ConsoleGameLogger } from "./infrastructure/logging/console-game-logger.js";
import { FileGameLogger } from "./infrastructure/logging/file-game-logger.js";
import { CompositeGameLogger } from "./infrastructure/logging/composite-game-logger.js";
import { appendFileSync } from "fs";
const wss = new WebSocketServer({ port: 2567 });

const userRepo = new MemoryUserRepository();
const authService = new AuthService(userRepo);
const roomIdGen = new RandomRoomIdGenerator();
const roomRepo = new InMemoryRoomRepository();
const roomService = new RoomService(roomIdGen, roomRepo);
const chipRepo = new InMemoryChipRepository();
const logger   = new CompositeGameLogger([
  new ConsoleGameLogger(),
  new FileGameLogger("game-events.jsonl"),
]);
const gameServer = new GameController(authService, roomService, chipRepo, logger);

wss.on("connection", (ws: any) => {
  const session = new UserSession(ws);
  console.log(`[WS] connected  session=${session.getSessionId()}`);

  ws.on("message", async (raw: any) => {
    try {
      const message = JSON.parse(raw.toString());
      const id = session.isAuthenticated()
        ? `user:${session.getUserId()}`
        : `session:${session.getSessionId()}`;

      // ── เพิ่ม log ──
      const { type, data } = message;
      const logLine = [
        new Date().toISOString(),
        `[RECEIVE from=${id}]`,
        `type=${type}`,
        data ? `data=${JSON.stringify(data)}` : "",
      ].filter(Boolean).join(" ");
      console.log(logLine);
      appendFileSync("log.txt", logLine + "\n");
      // ─────────────

      await gameServer.handleMessage(session, message);
    } catch (err) {
      console.error("[WS] parse error:", err);
    }
  });
  ws.on("close", () => {
    const uid = session.getUserId();
    if (uid !== undefined) gameServer.removeSession(uid);
    console.log(`[WS] closed     session=${session.getSessionId()}`);
  });
});

console.log("Server running on ws://localhost:2567");