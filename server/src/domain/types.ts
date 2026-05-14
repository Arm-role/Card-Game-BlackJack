export type Suit = '♣' | '♦' | '♥' | '♠';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'PLAYING' | 'STAND' | 'BUST' | 'BLACKJACK';
export type GameResult = "WIN" | "LOSE" | "DRAW" | "PENDING";

export type GameState =
  | "WAITING"
  | "DEALING"
  | "PLAYER_TURN"
  | "DEALER_TURN"
  | "RESOLVING";

export type RoomState =
  | "WAITING"
  | "PLAYING";

export type GameEvent =
  | "START"
  | "PLAYER_READY"
  | "ALL_READY"
  | "HIT"
  | "STAND";

export type PlayerAction = "HIT" | "STAND";

export type ActionResult = {
  card?: Card;
  status: PlayerStatus;
  turnChanged: boolean;
  nextPlayerId?: number;
  gameEnded: boolean;
  results?: Array<{ playerId: number; result: GameResult }>;
};

export type SeatRole = "dealer" | "player";

export type Seat = {
  seatIndex: number;
  role: SeatRole;
  playerId?: number;
  username?: string;
  chip?: number;
};
