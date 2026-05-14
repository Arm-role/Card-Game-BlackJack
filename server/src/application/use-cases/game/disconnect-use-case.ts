import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { IChipRepository } from "../../ports/i-chip-repository.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";
import { RECONNECT_TIMEOUT_MS } from "../../../config/config.js";

export class DisconnectUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
    private readonly chipRepo: IChipRepository,
    private readonly sessions: Map<number, UserSession>,
    private readonly reconnectTimers: Map<number, ReturnType<typeof setTimeout>>,
  ) {}

  removeSession(userId: number): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    if (!session.isAuthenticated()) {
      this.sessions.delete(userId);
      return;
    }

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(userId);
      this.handleDisconnect(session);
      this.sessions.delete(userId);
    }, RECONNECT_TIMEOUT_MS);

    this.reconnectTimers.set(userId, timer);
  }

  private handleDisconnect(session: UserSession): void {
    if (!session.isAuthenticated()) return;

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    const chip = room.getSeatByPlayerId(playerId)?.chip;
    if (chip !== undefined) this.chipRepo.set(playerId, chip);

    const { turnChanged, nextPlayerId, hostChanged, newHostId } = room.removePlayer(playerId);

    if (room.getPlayerIds().length === 0) {
      this.roomService.deleteRoom(room.getRoomId());
      return;
    }

    this.broadcaster.broadcastRoomUpdate(room);

    if (hostChanged) {
      this.broadcaster.broadcastToRoom(room, {
        type: "room_update",
        action: "host_changed",
        payload: { hostId: newHostId ?? null },
      });
    }

    if (turnChanged) {
      this.broadcaster.broadcastToRoom(room, {
        type: "game_update",
        action: "turn_changed",
        payload: { currentPlayer: nextPlayerId ?? null },
      });
    }
  }
}
