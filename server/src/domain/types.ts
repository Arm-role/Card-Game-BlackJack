export enum Suit {
  CLUBS    = '♣',
  DIAMONDS = '♦',
  HEARTS   = '♥',
  SPADES   = '♠',
}

export enum Rank {
  TWO   = '2',
  THREE = '3',
  FOUR  = '4',
  FIVE  = '5',
  SIX   = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE  = '9',
  TEN   = '10',
  JACK  = 'J',
  QUEEN = 'Q',
  KING  = 'K',
  ACE   = 'A',
}

export interface Card {
  suit: Suit;
  rank: Rank;
}

export enum PlayerStatus {
  PLAYING   = 'PLAYING',
  STAND     = 'STAND',
  BUST      = 'BUST',
  BLACKJACK = 'BLACKJACK',
}

export enum GameResult {
  WIN     = 'WIN',
  LOSE    = 'LOSE',
  DRAW    = 'DRAW',
  PENDING = 'PENDING',
}

export enum GameState {
  WAITING     = 'WAITING',
  DEALING     = 'DEALING',
  PLAYER_TURN = 'PLAYER_TURN',
  DEALER_TURN = 'DEALER_TURN',
  RESOLVING   = 'RESOLVING',
}

export enum RoomState {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
}

export enum GameEvent {
  START        = 'START',
  PLAYER_READY = 'PLAYER_READY',
  ALL_READY    = 'ALL_READY',
  HIT          = 'HIT',
  STAND        = 'STAND',
}

export enum PlayerAction {
  HIT   = 'HIT',
  STAND = 'STAND',
}

export enum SeatRole {
  DEALER = 'dealer',
  PLAYER = 'player',
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
