import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";

export class StartGameUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
  ) {}

  execute(session: UserSession): void {
    if (!session.isAuthenticated()) {
      session.send({ type: "game_result", action: "start", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) {
      session.send({ type: "game_result", action: "start", success: false, reason: "ROOM_NOT_FOUND" });
      return;
    }

    if (!room.canStartGame(playerId)) {
      session.send({ type: "game_result", action: "start", success: false, reason: "NOT_HOST" });
      return;
    }

    room.startGame();
    room.placeBets();
    this.broadcaster.broadcastToRoom(room, {
      type: "game_update",
      action: "start",
      payload: { roomId: room.getRoomId() },
    });
    this.broadcaster.broadcastGameState(room);
  }
}
