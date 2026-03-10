import { WebSocketServer } from "ws";
import { UserSession } from "./core/user-session";
import { GameServer } from "./server/game-server";
import { AuthService } from "./service/auth-service";
import { RoomService } from "./service/room-service";
import { RandomRoomIdGenerator } from "./models/roomId-generator";
import { MemoryUserRepository } from "./models/memory-user-repository";

const wss = new WebSocketServer({ port: 2567 });

const userRepo = new MemoryUserRepository();
const authService = new AuthService(userRepo);

const roomIdGenerator = new RandomRoomIdGenerator();
const roomService = new RoomService(roomIdGenerator);

const gameServer = new GameServer(authService, roomService);

wss.on("connection", (ws) => {

  const session = new UserSession(ws);

  console.log(`Session connected: ${session.getSessionId()}`);

  ws.on("message", async (raw) => {
    try {

      const message = JSON.parse(raw.toString());

      const id = session.isAuthenticated()
        ? `user:${session.getUserId()}`
        : `session:${session.getSessionId()}`;

      console.log(`Received from ${id}:`, message);

      await gameServer.handleMessage(session, message);

    } catch (err) {
      console.error("Invalid JSON:", err);
    }
  });

  ws.on("close", () => {

    if (session.isAuthenticated()) {
      gameServer.removeSession(session.getUserId());
    }

    console.log(`Session closed`);
  });

});

console.log("Server running on ws://localhost:2567");