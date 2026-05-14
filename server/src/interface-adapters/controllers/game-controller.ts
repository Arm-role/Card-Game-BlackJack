import { MessageDispatcher } from "../../infrastructure/network/message-dispatcher.js";
import { UserSession } from "../../infrastructure/network/user-session.js";
import { RoomService } from "../../service/room-service.js";
import { IAuthService } from "../../application/ports/i-auth-service.js";
import { IChipRepository } from "../../application/ports/i-chip-repository.js";
import { IGameLogger } from "../../domain/logging/i-game-logger.js";
import { WsEventPublisher } from "../../infrastructure/network/ws-event-publisher.js";
import { GameBroadcaster } from "../../application/services/game-broadcaster.js";

import { RegisterUseCase } from "../../application/use-cases/auth/register-use-case.js";
import { LoginUseCase } from "../../application/use-cases/auth/login-use-case.js";
import { CreateRoomUseCase } from "../../application/use-cases/room/create-room-use-case.js";
import { JoinRoomUseCase } from "../../application/use-cases/room/join-room-use-case.js";
import { QuickJoinUseCase } from "../../application/use-cases/room/quick-join-use-case.js";
import { LeaveRoomUseCase } from "../../application/use-cases/room/leave-room-use-case.js";
import { SwapSeatUseCase } from "../../application/use-cases/room/swap-seat-use-case.js";
import { SwapResponseUseCase } from "../../application/use-cases/room/swap-response-use-case.js";
import { StartGameUseCase } from "../../application/use-cases/game/start-game-use-case.js";
import { PlayerReadyUseCase } from "../../application/use-cases/game/player-ready-use-case.js";
import { PlayerHitUseCase } from "../../application/use-cases/game/player-hit-use-case.js";
import { PlayerStandUseCase } from "../../application/use-cases/game/player-stand-use-case.js";
import { ClaimChipUseCase } from "../../application/use-cases/game/claim-chip-use-case.js";
import { DisconnectUseCase } from "../../application/use-cases/game/disconnect-use-case.js";

export class GameController {
  private readonly sessions = new Map<number, UserSession>();
  private readonly reconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly dispatcher: MessageDispatcher;

  private readonly disconnect: DisconnectUseCase;

  constructor(
    authService: IAuthService,
    roomService: RoomService,
    chipRepo: IChipRepository,
    logger: IGameLogger,
  ) {
    const publisher  = new WsEventPublisher(this.sessions);
    const broadcaster = new GameBroadcaster(publisher, chipRepo, roomService, logger);

    const register   = new RegisterUseCase(authService, this.sessions, logger);
    const login      = new LoginUseCase(authService, roomService, this.sessions, this.reconnectTimers, logger);
    const createRoom = new CreateRoomUseCase(roomService, broadcaster);
    const joinRoom   = new JoinRoomUseCase(roomService, broadcaster);
    const quickJoin  = new QuickJoinUseCase(roomService, broadcaster);
    const leaveRoom  = new LeaveRoomUseCase(roomService, broadcaster, chipRepo);
    const swapSeat   = new SwapSeatUseCase(roomService, broadcaster, this.sessions);
    const swapResponse = new SwapResponseUseCase(roomService, broadcaster);
    const startGame  = new StartGameUseCase(roomService, broadcaster);
    const playerReady = new PlayerReadyUseCase(roomService, broadcaster);
    const playerHit  = new PlayerHitUseCase(roomService, broadcaster, logger);
    const playerStand = new PlayerStandUseCase(roomService, broadcaster, logger);
    const claimChip  = new ClaimChipUseCase(chipRepo, logger);

    this.disconnect = new DisconnectUseCase(
      roomService, broadcaster, chipRepo, this.sessions, this.reconnectTimers,
    );

    this.dispatcher = new MessageDispatcher();
    type Msg = { type: string; data: unknown };

    this.dispatcher.register<Msg>("request_register",        (s, m) => register.execute(s, m.data));
    this.dispatcher.register<Msg>("request_login",           (s, m) => login.execute(s, m.data));
    this.dispatcher.register<Msg>("request_create_room",     (s, m) => createRoom.execute(s, m.data));
    this.dispatcher.register<Msg>("request_join_room",       (s, m) => joinRoom.execute(s, m.data));
    this.dispatcher.register<Msg>("request_swap_seat",       (s, m) => swapSeat.execute(s, m.data));
    this.dispatcher.register<Msg>("request_swap_response",   (s, m) => swapResponse.execute(s, m.data));
    this.dispatcher.register<Msg>("request_quick_join_room", (s)    => quickJoin.execute(s));
    this.dispatcher.register<Msg>("request_leave_room",      (s)    => leaveRoom.execute(s));
    this.dispatcher.register<Msg>("request_room_snapshot",   (s)    => this.handleSnapshot(s, roomService));
    this.dispatcher.register<Msg>("request_start_game",      (s)    => startGame.execute(s));
    this.dispatcher.register<Msg>("request_player_ready",    (s)    => playerReady.execute(s));
    this.dispatcher.register<Msg>("request_hit",             (s)    => playerHit.execute(s));
    this.dispatcher.register<Msg>("request_stand",           (s)    => playerStand.execute(s));
    this.dispatcher.register<Msg>("request_claim_chip",      (s)    => claimChip.execute(s));
  }

  public async handleMessage(session: UserSession, raw: unknown): Promise<void> {
    await this.dispatcher.dispatch(session, raw);
  }

  public addSession(session: UserSession): void {
    const uid = session.getUserId();
    if (uid !== undefined) this.sessions.set(uid, session);
  }

  public removeSession(userId: number): void {
    this.disconnect.removeSession(userId);
  }

  private handleSnapshot(session: UserSession, roomService: RoomService): void {
    if (!session.isAuthenticated()) return;
    const room = roomService.findRoomByPlayer(session.getUserId()!);
    if (!room) return;
    session.send({ type: "room_update", payload: room.getSnapshot() });
  }
}
