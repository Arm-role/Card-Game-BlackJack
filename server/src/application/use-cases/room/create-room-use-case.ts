import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";
import { BET_AMOUNT } from "../../../config/config.js";

export class CreateRoomUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
  ) {}

  execute(session: UserSession, data: unknown): void {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "create", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }

    const { minChip, betAmount } = (data ?? {}) as Record<string, unknown>;
    const resolvedMinChip = typeof minChip === "number" ? minChip : 0;
    const resolvedBetAmount = typeof betAmount === "number" ? betAmount : BET_AMOUNT;
    const playerId = session.getUserId()!;

    if (this.broadcaster.resolveChip(playerId) < resolvedBetAmount) {
      session.send({ type: "room_result", action: "create", success: false, reason: "INSUFFICIENT_CHIP" });
      return;
    }

    const room = this.roomService.createRoom({ minChip: resolvedMinChip, betAmount: resolvedBetAmount });
    this.broadcaster.setupRoomCallbacks(room);

    room.addPlayer(playerId, session.getUsername()!, this.broadcaster.resolveChip(playerId));

    session.send({
      type: "room_result",
      action: "create",
      success: true,
      seat: room.getSeatByPlayerId(playerId),
    });
    this.broadcaster.broadcastRoomUpdate(room);
  }
}
