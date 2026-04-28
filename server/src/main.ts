import { WebSocketServer } from "ws";
import { UserSession } from "./core/user-session.js";
import { GameServer } from "./server/game-server.js";
import { AuthService } from "./service/auth-service.js";
import { RoomService } from "./service/room-service.js";
import { RandomRoomIdGenerator } from "./models/roomId-generator.js";
import { MemoryUserRepository } from "./models/memory-user-repository.js";
 
const wss = new WebSocketServer({ port: 2567 });
 
const userRepo      = new MemoryUserRepository();
const authService   = new AuthService(userRepo);
const roomIdGen     = new RandomRoomIdGenerator();
const roomService   = new RoomService(roomIdGen);
const gameServer    = new GameServer(authService, roomService);
 
wss.on("connection", (ws: any) => {
  const session = new UserSession(ws);
  console.log(`[WS] connected  session=${session.getSessionId()}`);
 
  ws.on("message", async (raw: any) => {
    try {
      const message = JSON.parse(raw.toString());
      const id = session.isAuthenticated()
        ? `user:${session.getUserId()}`
        : `session:${session.getSessionId()}`;
      console.log(`[MSG] from ${id}:`, message);
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