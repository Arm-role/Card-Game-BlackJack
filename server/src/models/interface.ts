
export interface IUserRepository {
  createUser(username: string, passwordHash: string): Promise<UserAccount | undefined>;
  findByUsername(username: string): Promise<UserAccount | undefined>;
  findById(id: number): Promise<UserAccount | undefined>;
}

export interface UserAccount {
  id: number;
  username: string;
  passwordHash: string;
}

export interface IRoomIdGenerator {
  generate(): number;
}

// export interface BlackJackBoardListener
// {
//   onBoardBegin(players_hand: KangPlayerHand[], starting_seat: number, deck: number[]): void;
//   onPlayerDraw(seat_id: number, card: number): void;
//   onPlayerDiscard(seat_id: number, cards: number[]): void;
//   onNextPlayer(next_seat_id: number): void;

//   onError(err_type: ErrorType, detail: string, extra_info?: any): void;
// }