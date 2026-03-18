using System;

[Serializable]
public class AuthData
{
  public string username;
  public string password;
}

[Serializable]
public class RegisterRequest
{
  public string type;
  public AuthData data;
}

[Serializable]
public class LoginRequest
{
  public string type;
  public AuthData data;
}

[Serializable]
public class CreateRoomRequest
{
  public string type;
}

[Serializable]
public class JoinRoomRequest
{
  public string type;
  public RoomDataRequest data;
}

[Serializable]
public class RoomDataRequest
{
  public string roomId;
}

[Serializable]
public class QuickJoinRequest
{
  public string type;
}

[Serializable]
public class SwapSeatRequest
{
  public string type;
  public SwapSeatData data;
}

[Serializable]
public class SwapSeatData
{
  public int fromSeat;
  public int toSeat;
}

[Serializable]
public class SwapResponseRequest
{
  public string type;
  public SwapSeatResponsData data;
}

[Serializable]
public class SwapSeatResponsData
{
  public bool accept;
}

[Serializable]
public class StartGameRequest
{
  public string type;
}