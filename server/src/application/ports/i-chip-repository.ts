export interface IChipRepository {
  get(playerId: number): number | undefined;
  set(playerId: number, chip: number): void;
  has(playerId: number): boolean;
}
