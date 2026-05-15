export enum Suit {
  CLUBS,
  DIAMONDS,
  HEARTS,
  SPADES,
}

export enum Rank {
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
  NINE,
  TEN,
  JACK,
  QUEEN,
  KING,
  ACE,
}

export interface Card {
  suit: Suit;
  rank: Rank;
}

export enum PlayerStatus {
  PLAYING,
  STAND,
  BUST,
  BLACKJACK,
}

export enum GameResult {
  WIN,
  LOSE,
  DRAW,
  PENDING,
}

export enum GameState {
  WAITING,
  DEALING,
  PLAYER_TURN,
  DEALER_TURN,
  RESOLVING,
}

export enum RoomState {
  WAITING,
  PLAYING,
}

export enum GameEvent {
  START,
  PLAYER_READY,
  ALL_READY,
  HIT,
  STAND,
}

export enum SeatRole {
  DEALER,
  PLAYER,
}

export type ActionResult = {
  card?: Card;
  status: PlayerStatus;
  turnChanged: boolean;
  nextPlayerId?: number;
  gameEnded: boolean;
  results?: Array<{ playerId: number; result: GameResult }>;
};

export type Seat = {
  seatIndex: number;
  role: SeatRole;
  playerId?: number;
  username?: string;
  chip?: number;
};
