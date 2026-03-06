using System;
using System.Collections.Generic;

[Serializable]
public class BaseMessage
{
  public string type;
}

[Serializable]
public class AuthData
{
  public string username;
  public string password;
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
  public string action;
  public bool success;
}

[Serializable]
public class RoomUpdateMessage
{
  public string type;
  public RoomData payload;
}


[Serializable]
public class RoomData
{
  public int roomId;
  public int max_player_count;
  public List<PlayerData> players;
}

[Serializable]
public class ErrorData
{
  public string code;
  public string message;
}