import { WebSocketServer } from "ws";
import { UserSession } from "./core/user-session";
import { GameServer } from "./server/game-server";
import { MemoryUserRepository } from "./models/MemoryUserRepository";
import { AuthService } from "./service/auth-service";
import { RandomRoomIdGenerator } from "./models/RandomRoomIdGenerator";
import { RoomService } from "./service/room-service";

const wss = new WebSocketServer({ port: 2567 });

const userRepo = new MemoryUserRepository();
const authService = new AuthService(userRepo);

const roomIdGenerator = new RandomRoomIdGenerator();
const roomService = new RoomService(roomIdGenerator);

const gameServer = new GameServer(authService, roomService);

wss.on("connection", (ws) => {
  const session = new UserSession(ws);

  gameServer.addSession(session);

  console.log(`Session connected: ${session.getSessionId()}`);

  ws.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      console.log(`Received from ${session.getSessionId()}:`, message);

      await gameServer.handleMessage(session, message);

    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  });

  ws.on("close", () => {
    console.log(`Session ${session.getSessionId()} disconnected`);
    gameServer.removeSession(session.getSessionId());
  });
});

console.log("Server running on ws://localhost:2567");