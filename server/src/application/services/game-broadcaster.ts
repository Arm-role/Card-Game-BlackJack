import { IEventPublisher } from "../ports/i-event-publisher.js";
import { IChipRepository } from "../ports/i-chip-repository.js";
import { IGameLogger } from "../../domain/logging/i-game-logger.js";
import { RoomService } from "../../service/room-service.js";
import { Room } from "../../domain/entities/room.js";
import { GameResult, GameState, PlayerStatus } from "../../domain/types.js";
import { STARTING_CHIPS } from "../../config/config.js";

export class GameBroadcaster {
  constructor(
    private readonly publisher: IEventPublisher,
    private readonly chipRepo: IChipRepository,
    private readonly roomService: RoomService,
    private readonly logger: IGameLogger,
  ) {}

  broadcastToRoom(room: Room, message: unknown): void {
    this.publisher.broadcastToPlayers(room.getPlayerIds(), message);
  }

  broadcastRoomUpdate(room: Room): void {
    this.broadcastToRoom(room, {
      type: "room_update",
      action: "snapshot",
      room: room.getSnapshot(),
    });
  }

  broadcastGameState(room: Room): void {
    const gameState = room.getGameState();
    if (!gameState) return;

    let chipAfter: Map<number, number> | undefined;
    if (gameState.state === GameState.WAITING && gameState.results) {
      chipAfter = room.settleBets(gameState.results);

      for (const r of gameState.results) {
        this.logger.log({
          timestamp: new Date(),
          level: "INFO",
          event: {
            kind: "game_result",
            playerId: r.playerId,
            roomId: room.getRoomId(),
            result: GameResult[r.result],
            chipAfter: chipAfter.get(r.playerId) ?? 0,
          },
        });
      }
    }

    const payload = chipAfter
      ? {
          ...gameState,
          results: gameState.results!.map((r) => ({
            ...r,
            chipAfter: chipAfter!.get(r.playerId) ?? 0,
          })),
        }
      : gameState;

    this.broadcastToRoom(room, {
      type: "game_update",
      action: "state_changed",
      payload,
    });

    if (gameState.state === GameState.WAITING) {
      this.kickBrokePlayers(room);
    }
  }

  kickBrokePlayers(room: Room, toKick?: number[]): void {
    const kickList = toKick ?? room.getPlayersWithZeroChip();
    if (kickList.length === 0) return;

    for (const kickedId of kickList) {
      this.chipRepo.set(kickedId, 0);
      this.logger.log({
        timestamp: new Date(),
        level: "INFO",
        event: { kind: "room_kick", playerId: kickedId, roomId: room.getRoomId(), reason: "OUT_OF_CHIP" },
      });
      this.publisher.sendToPlayer(kickedId, {
        type: "room_result",
        action: "kicked",
        success: false,
        reason: "OUT_OF_CHIP",
      });
    }

    this.broadcastToRoom(room, {
      type: "room_update",
      action: "players_kicked",
      payload: { kickedIds: kickList, reason: "OUT_OF_CHIP" },
    });

    room.kickBrokePlayers(kickList);

    if (room.getPlayerIds().length === 0) {
      room.destroy();
      this.roomService.deleteRoom(room.getRoomId());
      return;
    }

    this.broadcastRoomUpdate(room);
  }

  setupRoomCallbacks(room: Room): void {
    room.onIdleTimeout = (roomId) => {
      this.broadcastToRoom(room, {
        type: "room_update",
        action: "room_closed",
        payload: { reason: "IDLE_TIMEOUT" },
      });
      room.destroy();
      this.roomService.deleteRoom(roomId);
    };

    room.onTurnTimeout = (playerId, result) => {
      this.logger.log({
        timestamp: new Date(),
        level: "WARN",
        event: { kind: "game_stand", playerId, roomId: room.getRoomId(), isTimeout: true },
      });
      this.broadcastToRoom(room, {
        type: "game_event",
        action: "player_stand",
        payload: { player_id: playerId, status: PlayerStatus.STAND },
      });
      if (result.turnChanged) {
        this.broadcastToRoom(room, {
          type: "game_update",
          action: "turn_changed",
          payload: { currentPlayer: result.nextPlayerId ?? null },
        });
      }
      if (result.gameEnded) {
        this.broadcastGameState(room);
      }
    };
  }

  resolveChip(playerId: number): number {
    if (this.chipRepo.has(playerId)) return this.chipRepo.get(playerId)!;
    const room = this.roomService.findRoomByPlayer(playerId);
    if (room) return room.getSeatByPlayerId(playerId)?.chip ?? STARTING_CHIPS;
    return STARTING_CHIPS;
  }
}
