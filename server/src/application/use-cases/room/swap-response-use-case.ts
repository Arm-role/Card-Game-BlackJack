import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";

export class SwapResponseUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
  ) {}

  execute(session: UserSession, data: unknown): void {
    if (!session.isAuthenticated()) return;

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    const request = room.getSwapRequest(playerId);
    if (!request) return;

    const { accept } = (data ?? {}) as Record<string, unknown>;
    if (accept) room.swapSeat(request.fromPlayerId, request.fromSeat, request.toSeat);
    room.removeSwapRequest(playerId);

    this.broadcaster.broadcastRoomUpdate(room);
  }
}
