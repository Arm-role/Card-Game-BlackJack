import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";

export class JoinRoomUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
  ) {}

  execute(session: UserSession, data: unknown): void {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "join", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }

    const { roomId } = (data ?? {}) as Record<string, unknown>;
    const room = this.roomService.getRoom(roomId as number);
    if (!room) {
      session.send({ type: "room_result", action: "join", success: false, reason: "ROOM_NOT_FOUND" });
      return;
    }

    const playerId = session.getUserId()!;
    const chip = this.broadcaster.resolveChip(playerId);

    if (!room.canJoin(chip)) {
      const reason = room.isFull() ? "ROOM_FULL" : "INSUFFICIENT_CHIP";
      session.send({ type: "room_result", action: "join", success: false, reason });
      return;
    }

    room.addPlayer(playerId, session.getUsername()!, chip);
    session.send({
      type: "room_result",
      action: "join",
      success: true,
      seat: room.getSeatByPlayerId(playerId),
    });
    this.broadcaster.broadcastRoomUpdate(room);
  }
}
