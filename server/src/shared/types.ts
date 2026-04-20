// ─── Card & Deck ─────────────────────────────────────────────────────────────

export type Suit = '♣' | '♦' | '♥' | '♠';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// ─── Player / Game status ────────────────────────────────────────────────────

export type PlayerStatus = 'PLAYING' | 'STAND' | 'BUST' | 'BLACKJACK';
export type GameResult = "WIN" | "LOSE" | "DRAW" | "PENDING";

// ─── FSM States ──────────────────────────────────────────────────────────────

export type GameState =
  | "WAITING"
  | "DEALING"
  | "PLAYER_TURN"
  | "DEALER_TURN"
  | "RESOLVING";

export type RoomState =
  | "WAITING"
  | "PLAYING";

// ─── FSM Events ──────────────────────────────────────────────────────────────

export type GameEvent =
  | "START"
  | "PLAYER_READY"
  | "ALL_READY"
  | "HIT"
  | "STAND"
  | "NEXT_TURN"
  | "DEALER_PLAY"
  | "END";


export type RoomEvent =
  | "START_GAME"
  | "ALL_READY"
  | "PLAYER_HIT"
  | "PLAYER_STAND"
  | "NEXT_TURN"
  | "DEALER_PLAY"
  | "END_GAME";

export type PlayerAction = "HIT" | "STAND";

// ─── ActionResult (returned from GameSession.applyAction) ────────────────────
// GameServer reads this to know exactly what to broadcast — no extra logic needed.

export type ActionResult = {
  /** Card drawn on HIT, undefined on STAND */
  card?: Card;
  /** Player's status after the action */
  status: PlayerStatus;
  /** Whether the turn moved to the next player */
  turnChanged: boolean;
  /** ID of the next player (undefined if game ended or dealer's turn) */
  nextPlayerId?: number;
  /** Whether the game has fully resolved */
  gameEnded: boolean;
  /** Final per-player results, populated when gameEnded === true */
  results?: Array<{ playerId: number; result: GameResult }>;
};

// ─── Seat ────────────────────────────────────────────────────────────────────

export type SeatRole = "dealer" | "player";

export type Seat = {
  seatIndex: number;
  role: SeatRole;
  playerId?: number;
  username?: string;
  chip?: number;
};