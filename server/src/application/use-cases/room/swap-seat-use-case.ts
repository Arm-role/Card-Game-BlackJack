import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";

export class SwapSeatUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
    private readonly sessions: Map<number, UserSession>,
  ) {}

  execute(session: UserSession, data: unknown): void {
    if (!session.isAuthenticated()) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "ROOM_NOT_FOUND" });
      return;
    }

    const { fromSeat, toSeat } = (data ?? {}) as Record<string, unknown>;
    if (fromSeat === undefined || toSeat === undefined) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "INVALID_INPUT" });
      return;
    }

    const from = room.getSeat(fromSeat as number);
    const to = room.getSeat(toSeat as number);
    if (!from || !to) {
      session.send({ type: "room_result", action: "swap_seat", success: false, reason: "INVALID_ROOM_SEAT" });
      return;
    }

    if (!to.playerId) {
      const success = room.swapSeat(playerId, fromSeat as number, toSeat as number);
      if (!success) {
        session.send({ type: "room_result", action: "swap_seat", success: false, reason: "SWAP_FAILED" });
        return;
      }
      this.broadcaster.broadcastRoomUpdate(room);
      return;
    }

    const targetPlayerId = to.playerId;
    room.addSwapRequest(targetPlayerId, {
      fromPlayerId: playerId,
      toPlayerId: targetPlayerId,
      fromSeat: fromSeat as number,
      toSeat: toSeat as number,
    });

    this.sessions.get(targetPlayerId)?.send({
      type: "room_update",
      action: "swap_request",
      success: true,
      seatSwap: {
        fromPlayerId: playerId,
        fromPlayerName: session.getUsername()!,
        fromSeat,
        toSeat,
      },
    });

    this.broadcaster.broadcastRoomUpdate(room);
  }
}
