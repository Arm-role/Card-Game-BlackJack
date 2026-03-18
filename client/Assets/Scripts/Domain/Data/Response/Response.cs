using System;
using System.Collections.Generic;

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
  public RoomData payload;
  public PlayerJoinRoomData player;
}

[Serializable]
public class PlayerJoinRoomData
{
  public int roomId;
  public SeatData seat;
}


[Serializable]
public class RoomData
{
  public int roomId;
  public int max_player_count;
  public string state;
  public List<SeatData> seats;
}

[Serializable]
public class SeatData
{
  public int seatIndex;
  public SeatRole role; 

  public int playerId;
  public string username;
  public int chip;

  public bool IsEmpty => playerId == 0;
}

public enum SeatRole
{
  Dealer,
  Player
}

[Serializable]
public class ErrorData
{
  public string code;
  public string message;
}