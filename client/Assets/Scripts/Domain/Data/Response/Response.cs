using System;
using System.Collections.Generic;

// =====================================================
// Base
// =====================================================

[Serializable]
public class Response
{
  public string type;
}

// =====================================================
// Auth
// =====================================================

[Serializable]
public class RegisterResultMessage
{
  public string type;        // "register_result"
  public bool success;
  public string username;
  public string reason;      // "INVALID_INPUT" | "USERNAME_EXISTS"
}

[Serializable]
public class LoginResultMessage
{
  public string type;        // "login_result"
  public bool success;
  public string username;
  public string reason;      // "INVALID_INPUT" | "INVALID_CREDENTIALS"
}

// =====================================================
// Room
// =====================================================

[Serializable]
public class RoomResultMessage
{
  public string type;        // "room_result"
  public string action;      // "create" | "join" | "quick_join" | "leave" | "swap_seat"
  public bool success;
  public string reason;      // "NOT_AUTHENTICATED" | "ROOM_NOT_FOUND" | "ROOM_FULL" | "NO_AVAILABLE_ROOM" | "INVALID_INPUT" | "INVALID_ROOM_SEAT" | "SWAP_FAILED"
  public SeatData seat;      // มีเฉพาะ create/join/quick_join
}

[Serializable]
public class RoomUpdateMessage
{
  public string type;        // "room_update"
  public string action;       // "snapshot" | "swap_request" | "host_changed"
  public bool success;
  public RoomData room;      // มีเฉพาะ action="snapshot"
  public SeatSwapData seatSwap; // มีเฉพาะ action="swap_request"
  public HostChangedData hostChanged;
}

[Serializable]
public class RoomData
{
  public int roomId;
  public int hostId;
  public int max_player_count;
  public int player_count;
  public int user_count;
  public string state;       // "WAITING" | "PLAYING"
  public List<SeatData> seats;
}

[Serializable]
public class HostChangedData
{
  public int hostId;
}

[Serializable]
public class SeatData
{
  public int seatIndex;
  public string role;        // "player" | "dealer"
  public int playerId;
  public string username;
  public int chip;

  public bool IsDealer => role == "dealer";
  public bool IsPlayer => role == "player";
  public bool IsEmpty => playerId == 0;
}

[Serializable]
public class SeatSwapData
{
  public int fromPlayerId;
  public string fromPlayerName;
  public int fromSeat;
  public int toSeat;
}

// =====================================================
// Error
// =====================================================

[Serializable]
public class ErrorMessage
{
  public string type;        // "error"
  public string reason;      // "NOT_AUTHENTICATED" | "ROOM_UNDEFINED" | "ANIMATION_IN_PROGRESS" | "ACTION_UNDEFINED"
}

// =====================================================
// Game Result  (server → game_result)
// =====================================================

[Serializable]
public class GameResultMessage
{
  public string type;        // "game_result"
  public string action;      // "start"
  public bool success;
  public string reason;      // "NOT_AUTHENTICATED" | "ROOM_NOT_FOUND" | "NOT_ENOUGH_PLAYERS"
}

// =====================================================
// Game Update  (server → game_update)
// =====================================================

/// <summary>
/// type="game_update"
/// action= "start" | "state_changed" | "ready_to_act" | "turn_changed"
/// </summary>
[Serializable]
public class GameUpdateMessage
{
  public string type;
  public string action;
  public GameUpdatePayload payload;
}

/// <summary>
/// ใช้ร่วมกันทุก action เพราะ field ต่างกันตาม action:
///   start        → roomId
///   state_changed → state, currentPlayer, players[], dealer
///   ready_to_act  → (payload เป็น null)
///   turn_changed  → currentPlayer
/// </summary>
[Serializable]
public class GameUpdatePayload
{
  // "start"
  public int roomId;

  // "state_changed" + "turn_changed"
  public string state;           // "WAITING" | "DEALING" | "PLAYER_TURN" | "DEALER_TURN" | "RESOLVING"
  public int currentPlayer;      // playerId ที่เป็น turn ปัจจุบัน (0 = dealer)

  // "state_changed"
  public PlayerState[] players;
  public DealerState dealer;
  public PlayerRoundResult[] results; // มีเฉพาะตอนจบเกม
}

[Serializable]
public class PlayerState
{
  public int playerId;
  public CardDataRes[] hand;
  public int score;
  public string status;          // "PLAYING" | "STAND" | "BUST" | "BLACKJACK"
  public string result;          // "PENDING" | "WIN" | "LOSE" | "DRAW" | "BLACKJACK"
}

[Serializable]
public class DealerState
{
  public CardDataRes[] hand;
  public int score;
}

[Serializable]
public class PlayerRoundResult
{
  public int playerId;
  public string result;          // "WIN" | "LOSE" | "DRAW" | "BLACKJACK" | "PENDING"
}

// =====================================================
// Game Event  (server → game_event)
// =====================================================

/// <summary>
/// type="game_event"
/// action= "player_hit" | "player_stand"
/// </summary>
[Serializable]
public class GameEventMessage
{
  public string type;
  public string action;
  public GameEventPayload payload;
}

/// <summary>
/// player_hit  → player_id, status, card, score
/// player_stand → player_id, status  (card=null, score=0)
/// </summary>
[Serializable]
public class GameEventPayload
{
  public int player_id;
  public string status;          // "PLAYING" | "BUST" | "STAND" | "BLACKJACK"
  public CardDataRes card;       // null เมื่อ stand
  public int score;
}

// =====================================================
// Card
// =====================================================

[Serializable]
public class CardDataRes
{
  public string suit;            // "♣" | "♦" | "♥" | "♠"
  public string rank;            // "2"-"10" | "J" | "Q" | "K" | "A"

  public int ToIndex() => CardIndex.ToIndex(suit, rank);
  public override string ToString() => $"{suit}{rank}";
}

// =====================================================
// CardIndex utility
// =====================================================

public static class CardIndex
{
  private static readonly string[] Suits = { "♣", "♦", "♥", "♠" };
  private static readonly string[] Ranks = { "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A" };

  public static int ToIndex(string suit, string rank)
  {
    int s = Array.IndexOf(Suits, suit);
    int r = Array.IndexOf(Ranks, rank);
    if (s == -1 || r == -1) throw new ArgumentException($"Invalid card: {rank}{suit}");
    return s * 13 + r;
  }

  public static (string suit, string rank) FromIndex(int index)
  {
    if (index < 0 || index > 51) throw new ArgumentOutOfRangeException(nameof(index));
    return (Suits[index / 13], Ranks[index % 13]);
  }
}