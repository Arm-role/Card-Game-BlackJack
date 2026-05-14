import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";

export class PlayerReadyUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
  ) {}

  execute(session: UserSession): void {
    if (!session.isAuthenticated()) return;

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    const allReady = room.setPlayerReady(playerId);
    if (!allReady) return;

    if (!room.isReadyToAct()) {
      this.broadcaster.broadcastGameState(room);
      return;
    }

    this.broadcaster.broadcastToRoom(room, { type: "game_update", action: "ready_to_act" });
    this.broadcaster.broadcastToRoom(room, {
      type: "game_update",
      action: "turn_changed",
      payload: { currentPlayer: room.getCurrentPlayerId() },
    });
  }
}
