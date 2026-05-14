import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";
import { IGameLogger } from "../../../domain/logging/i-game-logger.js";

export class PlayerStandUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
    private readonly logger: IGameLogger,
  ) {}

  execute(session: UserSession): void {
    if (!session.isAuthenticated()) return;

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room || !room.isPlayerTurn(playerId)) {
      this.logger.log({ timestamp: new Date(), level: "SUSPICIOUS", event: { kind: "suspicious", playerId, roomId: room?.getRoomId(), action: "stand", reason: "NOT_YOUR_TURN" } });
      session.send({ type: "error", reason: "ROOM_UNDEFINED" });
      return;
    }
    if (!room.isReadyToAct()) {
      this.logger.log({ timestamp: new Date(), level: "WARN", event: { kind: "suspicious", playerId, roomId: room.getRoomId(), action: "stand", reason: "ANIMATION_IN_PROGRESS" } });
      session.send({ type: "error", reason: "ANIMATION_IN_PROGRESS" });
      return;
    }

    const result = room.applyAction(playerId, "STAND");
    if (!result) {
      session.send({ type: "error", reason: "ACTION_UNDEFINED" });
      return;
    }

    this.logger.log({ timestamp: new Date(), level: "INFO", event: { kind: "game_stand", playerId, roomId: room.getRoomId(), isTimeout: false } });

    this.broadcaster.broadcastToRoom(room, {
      type: "game_event",
      action: "player_stand",
      payload: { player_id: playerId, status: "STAND" },
    });

    if (result.turnChanged) {
      this.broadcaster.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: { currentPlayer: result.nextPlayerId ?? null },
      });
    }

    if (result.gameEnded) {
      this.broadcaster.broadcastGameState(room);
    }
  }
}
