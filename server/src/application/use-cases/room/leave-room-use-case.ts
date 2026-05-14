import { RoomService } from "../../../service/room-service.js";
import { GameBroadcaster } from "../../services/game-broadcaster.js";
import { IChipRepository } from "../../ports/i-chip-repository.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";

export class LeaveRoomUseCase {
  constructor(
    private readonly roomService: RoomService,
    private readonly broadcaster: GameBroadcaster,
    private readonly chipRepo: IChipRepository,
  ) {}

  execute(session: UserSession): void {
    if (!session.isAuthenticated()) return;

    const playerId = session.getUserId()!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (!room) return;

    const chip = room.getSeatByPlayerId(playerId)?.chip;
    if (chip !== undefined) this.chipRepo.set(playerId, chip);

    room.removePlayer(playerId);
    session.send({ type: "room_result", action: "leave", success: true });

    if (room.getPlayerIds().length === 0) {
      this.roomService.deleteRoom(room.getRoomId());
    } else {
      this.broadcaster.broadcastRoomUpdate(room);
    }
  }
}
