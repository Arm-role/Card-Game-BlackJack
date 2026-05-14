import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";

export class QuickJoinUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
  ) {}

  execute(session: UserSession): void {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "quick_join", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }

    const playerId = session.getUserId()!;
    const chip = this.broadcaster.resolveChip(playerId);

    const room = this.roomService.quickJoin(chip);
    if (!room) {
      session.send({ type: "room_result", action: "quick_join", success: false, reason: "NO_AVAILABLE_ROOM" });
      return;
    }

    if (!room.canJoin(chip)) {
      session.send({ type: "room_result", action: "quick_join", success: false, reason: "INSUFFICIENT_CHIP" });
      return;
    }

    room.addPlayer(playerId, session.getUsername()!, chip);
    session.send({
      type: "room_result",
      action: "quick_join",
      success: true,
      seat: room.getSeatByPlayerId(playerId),
    });
    this.broadcaster.broadcastRoomUpdate(room);
  }
}
