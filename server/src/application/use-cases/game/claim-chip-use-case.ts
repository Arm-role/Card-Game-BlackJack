import { IChipRepository } from "../../ports/i-chip-repository.js";
import { UserSession } from "../../../infrastructure/network/user-session.js";
import { IGameLogger } from "../../../domain/logging/i-game-logger.js";
import { CLAIM_CHIP_AMOUNT } from "../../../config/config.js";

export class ClaimChipUseCase {
  constructor(
    private readonly chipRepo: IChipRepository,
    private readonly logger: IGameLogger,
  ) {}

  execute(session: UserSession): void {
    if (!session.isAuthenticated()) {
      session.send({ type: "claim_chip_result", success: false, reason: "NOT_AUTHENTICATED" });
      return;
    }

    const playerId = session.getUserId()!;
    const currentChip = this.chipRepo.get(playerId);

    if (currentChip !== undefined && currentChip > 0) {
      this.logger.log({ timestamp: new Date(), level: "SUSPICIOUS", event: { kind: "chip_claim", playerId, success: false } });
      session.send({ type: "claim_chip_result", success: false, reason: "CHIP_NOT_EMPTY" });
      return;
    }

    this.chipRepo.set(playerId, CLAIM_CHIP_AMOUNT);
    this.logger.log({ timestamp: new Date(), level: "INFO", event: { kind: "chip_claim", playerId, success: true, chipAfter: CLAIM_CHIP_AMOUNT } });
    session.send({ type: "claim_chip_result", success: true, chip: CLAIM_CHIP_AMOUNT });
  }
}
