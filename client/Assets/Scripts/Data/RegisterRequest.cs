using System;

[Serializable]
public class RegisterRequest
{
  public string type = "register";
  public AuthData data;
}

[Serializable]
public class LoginRequest
{
  public string type = "login";
  public AuthData data;
}

[Serializable]
public class CreateRoomRequest
{
  public string type = "create_room";
}

[Serializable]
public class JoinRoomRequest
{
  public string type = "join_room";
  public RoomDataRequest data;
}

[Serializable]
public class QuickJoinRequest
{
  public string type = "quick_join_room";
}

[Serializable]
public class RoomDataRequest
{
  public string roomId;
}
