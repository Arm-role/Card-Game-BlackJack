using System;
using System.Collections.Generic;
using UnityEditor.VersionControl;

[Serializable]
public class Response
{
  public string type;
}

[Serializable]
public class LoginResultMessage
{
  public string type;
  public bool success;
  public string username;
}

[Serializable]
public class RegisterResultMessage
{
  public string type;
  public bool success;
  public string username;
}

[Serializable]
public class RoomResultMessage
{
  public string type;
  public string action;
  public bool success;
  public string reason;
  public SeatData seat;
}


[Serializable]
public class RoomUpdateMessage
{
  public string type;
  public string action;

  public RoomData room;
  public SeatSwapData seatSwap;
  public PlayerJoinRoomData player;
}


[Serializable]
public class RoomData
{
  public int roomId;
  public int max_player_count;
  public int player_count;
  public int user_count;
  public string state;
  public List<SeatData> seats;
}

[Serializable]
public class SeatSwapData
{
  public int fromPlayerId;
  public string fromPlayerName;
  public int fromSeat;
  public int toSeat;
}


[Serializable]
public class PlayerJoinRoomData
{
  public int roomId;
  public SeatData seat;
}


[Serializable]
public class SeatData
{
  public int seatIndex;
  public string role; 

  public int playerId;
  public string username;
  public int chip;

  public bool IsDealer => role == "dealer";
  public bool IsPlayer => role == "player";
  public bool IsEmpty => playerId == 0;
}

[Serializable]
public class ErrorData
{
  public string code;
  public string message;
}

[Serializable]
public class GameResultMessage
{
  public string type;
  public string action;
  public bool success;
  public string reason;
}

[Serializable]
public class GameUpdateMessage
{
  public string type;
  public string action;
  public GamePlayState payload;
}

[Serializable]
public class GamePlayState
{
  public int roomId;
  public string state;
}

[Serializable]
public class GameEventMessage
{
  public string type;
  public string action;
  public PlayerHitRes payload;
}

[Serializable]
public class PlayerHitRes
{
  public int player_id;
  public string status;

  public CardDataRes card;
  public string score;
}

[Serializable]
public class CardDataRes
{
  public string suit;
  public string rank;
}