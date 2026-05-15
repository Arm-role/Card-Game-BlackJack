import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";
import { IGameLogger } from "../../../domain/logging/i-game-logger.js";
import { GameEvent, PlayerStatus } from "../../../domain/types.js";

const RANK_SYMBOLS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUIT_SYMBOLS = ['♣','♦','♥','♠'];

export class PlayerHitUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
    private readonly logger: IGameLogger,
  ) {}

  execute(session: UserSession): void {
    if (!session.isAuthenticated()) {
      session.send({ type: "error", reason: "NOT_AUTHENTICATED" });
      return;
    }

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);

    if (!room || !room.isPlayerTurn(playerId)) {
      this.logger.log({ timestamp: new Date(), level: "SUSPICIOUS", event: { kind: "suspicious", playerId, roomId: room?.getRoomId(), action: "hit", reason: "NOT_YOUR_TURN" } });
      session.send({ type: "error", reason: "ROOM_UNDEFINED" });
      return;
    }
    if (!room.isReadyToAct()) {
      this.logger.log({ timestamp: new Date(), level: "WARN", event: { kind: "suspicious", playerId, roomId: room.getRoomId(), action: "hit", reason: "ANIMATION_IN_PROGRESS" } });
      session.send({ type: "error", reason: "ANIMATION_IN_PROGRESS" });
      return;
    }

    const result = room.applyAction(playerId, GameEvent.HIT);
    if (!result) {
      this.logger.log({ timestamp: new Date(), level: "SUSPICIOUS", event: { kind: "suspicious", playerId, roomId: room.getRoomId(), action: "hit", reason: "ACTION_UNDEFINED" } });
      session.send({ type: "error", reason: "ACTION_UNDEFINED" });
      return;
    }

    const card = result.card ? `${RANK_SYMBOLS[result.card.rank]}${SUIT_SYMBOLS[result.card.suit]}` : "?";
    this.logger.log({ timestamp: new Date(), level: "INFO", event: { kind: "game_hit", playerId, roomId: room.getRoomId(), card, score: room.getPlayerScore(playerId), status: PlayerStatus[result.status] } });

    this.broadcaster.broadcastToRoom(room, {
      type: "game_event",
      action: "player_hit",
      payload: { player_id: playerId, card: result.card, status: result.status, score: room.getPlayerScore(playerId) },
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
