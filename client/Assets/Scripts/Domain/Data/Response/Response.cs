using System;
using System.Collections.Generic;

// =====================================================
// Enums  (wire values are numeric integers — order must match server types.ts)
// =====================================================

public enum SeatRole        { Dealer, Player }
public enum PlayerStatus    { Playing, Stand, Bust, Blackjack }
public enum GameResult      { Win, Lose, Draw, Pending }
public enum ServerGameState { Waiting, Dealing, PlayerTurn, DealerTurn, Resolving }
public enum RoomState       { Waiting, Playing }

// =====================================================
// Base
// =====================================================

[Serializable]
public class Response
{
  public string type;
}

// =====================================================
// Chip
// =====================================================

[Serializable]
public class ClaimChipResultMessage
{
  public string type;     // "claim_chip_result"
  public bool success;
  public int chip;        // chip ที่ได้รับ (เมื่อ success)
  public string reason;   // "NOT_AUTHENTICATED" | "CHIP_NOT_EMPTY"
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
  public string action;       // "snapshot"|"swap_request"|"host_changed"|"players_kicked"|"room_closed"
  public bool success;
  public RoomData room;      // มีเฉพาะ action="snapshot"
  public SeatSwapData seatSwap; // มีเฉพาะ action="swap_request"
  public HostChangedData hostChanged;
  public PlayersKickedData payload;
}

[Serializable]
public class RoomData
{
  public int roomId;
  public int hostId;
  public int minChip;
  public int betAmount;
  public int max_player_count;
  public int player_count;
  public int user_count;
  public int state;          // 0=Waiting 1=Playing
  public List<SeatData> seats;

  public RoomState State => (RoomState)state;
}

[Serializable]
public class HostChangedData
{
  public int hostId;
}

[Serializable]
public class PlayersKickedData
{
  public int[] kickedIds;
  public string reason;    // "OUT_OF_CHIP"
}

[Serializable]
public class SeatData
{
  public int seatIndex;
  public int role;           // 0=Dealer 1=Player
  public int playerId;
  public string username;
  public int chip;

  public SeatRole Role    => (SeatRole)role;
  public bool IsDealer   => Role == SeatRole.Dealer;
  public bool IsPlayer   => Role == SeatRole.Player;
  public bool IsEmpty    => playerId == 0;
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
  public int state;              // 0=Waiting 1=Dealing 2=PlayerTurn 3=DealerTurn 4=Resolving
  public int currentPlayer;      // playerId ที่เป็น turn ปัจจุบัน (0 = dealer)

  public ServerGameState State => (ServerGameState)state;

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
  public int status;             // 0=Playing 1=Stand 2=Bust 3=Blackjack
  public int result;             // 0=Win 1=Lose 2=Draw 3=Pending

  public PlayerStatus Status => (PlayerStatus)status;
  public GameResult   Result => (GameResult)result;
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
  public int result;             // 0=Win 1=Lose 2=Draw 3=Pending
  public int chipAfter;

  public GameResult Result => (GameResult)result;
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
  public int status;             // 0=Playing 1=Stand 2=Bust 3=Blackjack
  public CardDataRes card;       // null เมื่อ stand
  public int score;

  public PlayerStatus Status => (PlayerStatus)status;
}


// =====================================================
// Card
// =====================================================

[Serializable]
public class CardDataRes
{
  public int suit;               // 0=♣ 1=♦ 2=♥ 3=♠
  public int rank;               // 0=2 1=3 ... 8=10 9=J 10=Q 11=K 12=A

  public int ToIndex() => suit * 13 + rank;
  public override string ToString() => $"{CardIndex.SuitSymbol(suit)}{CardIndex.RankSymbol(rank)}";
}

// =====================================================
// CardIndex utility
// =====================================================

public static class CardIndex
{
  private static readonly string[] Suits = { "♣", "♦", "♥", "♠" };
  private static readonly string[] Ranks = { "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A" };

  public static string SuitSymbol(int suit) => Suits[suit];
  public static string RankSymbol(int rank) => Ranks[rank];

  public static int ToIndex(int suit, int rank) => suit * 13 + rank;

  public static (int suit, int rank) FromIndex(int index)
  {
    if (index < 0 || index > 51) throw new ArgumentOutOfRangeException(nameof(index));
    return (index / 13, index % 13);
  }
}