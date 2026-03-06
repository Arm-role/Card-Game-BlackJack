using UnityEngine;

public class NetworkHelper
{
  public static void Send(object obj)
  {
    if (WSClient.Instance != null)
    {
      WSClient.Instance.Send(obj);
    }
    else
      Debug.LogWarning("WSClient instance is not available.");
  }

  public static void RequestLogin(string username, string password)
  {
    var request = new LoginRequest
    {
      type = "login",
      data = new AuthData
      {
        username = username,
        password = password
      }
    };

    Send(request);
  }

  public static void RequestRegister(string username, string password)
  {
    var request = new RegisterRequest
    {
      type = "register",
      data = new AuthData
      {
        username = username,
        password = password
      }
    };

    Send(request);
  }

  public static void RequestCreateRoom()
  {
    var request = new CreateRoomRequest
    {
      type = "create_room",
    };

    Send(request);
  }

  public static void RequestJoinRoom(int roomId)
  {
    var request = new JoinRoomRequest
    {
      type = "join_room",
      data = new RoomDataRequest
      {
        roomId = roomId.ToString()
      }
    };

    Send(request);
  }

  public static void RequestQuickJoinRoom()
  {
    var request = new QuickJoinRequest
    {
      type = "quick_join_room"
    };

    Send(request);
  }

  public static void RequestRoomSnapshot()
  {
    string msg = "{\"type\":\"request_room_snapshot\"}";
    Send(msg);
  }
  public static void RequestLeaveRoom()
  {
    string msg = "{\"type\":\"leave_room\"}";
    Send(msg);
  }

  public static void SendPlayCard(string cardId)
  {
    string msg = "{\"type\":\"play_card\",\"cardId\":\"" + cardId + "\"}";
    Send(msg);
  }

  public static void SendNameChange(string newName)
  {
    string msg = "{\"type\":\"name_change\",\"newName\":\"" + newName + "\"}";
    Send(msg);
  }
}