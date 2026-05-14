import { IChipRepository } from "../../application/ports/i-chip-repository.js";

export class InMemoryChipRepository implements IChipRepository {
  private readonly chips = new Map<number, number>();

  get(playerId: number): number | undefined {
    return this.chips.get(playerId);
  }

  set(playerId: number, chip: number): void {
    this.chips.set(playerId, chip);
  }

  has(playerId: number): boolean {
    return this.chips.has(playerId);
  }
}
