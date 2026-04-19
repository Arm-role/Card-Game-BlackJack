export type Suit = '♣' | '♦' | '♥' | '♠';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'PLAYING' | 'STAND' | 'BUST' | 'BLACKJACK';

export type GameState =
  | "WAITING"
  | "DEALING"
  | "PLAYER_TURN"
  | "DEALER_TURN"
  | "RESOLVING";

export type GameEvent =
  | "START"
  | "PLAYER_READY"
  | "ALL_READY"
  | "HIT"
  | "STAND"
  | "NEXT_TURN"
  | "DEALER_PLAY"
  | "END";

export type GameResult =
  | 'WIN'
  | 'LOSE'
  | 'DRAW'
  | 'PENDING';

export type RoomState =
  | "WAITING"
  | "DEALING"
  | "AWAITING_READY"
  | "PLAYER_TURN"
  | "DEALER_TURN"
  | "RESOLVING";

export type RoomEvent =
  | "START_GAME"
  | "ALL_READY"
  | "PLAYER_HIT"
  | "PLAYER_STAND"
  | "NEXT_TURN"
  | "DEALER_PLAY"
  | "END_GAME";

export type PlayerActionResult = {
  playerId: number;
  action: "HIT" | "STAND";

  card?: any;

  status?: PlayerStatus;

  turnChanged: boolean;
  nextPlayerId?: number;

  gameEnded: boolean;
};