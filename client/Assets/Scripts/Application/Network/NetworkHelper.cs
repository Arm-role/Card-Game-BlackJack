using System;
using UnityEngine;
public class NetworkHelper
{
  public static event Action<object> OnSend;

  public static void RequestLogin(string username, string password)
  {
    var request = new LoginRequest
    {
      type = "request_login",
      data = new AuthData
      {
        username = username,
        password = password
      }
    };

    OnSend?.Invoke(request);
  }

  public static void RequestRegister(string username, string password)
  {
    var request = new RegisterRequest
    {
      type = "request_register",
      data = new AuthData
      {
        username = username,
        password = password
      }
    };

    OnSend?.Invoke(request);
  }

  public static void RequestCreateRoom(int minChip = GameConfig.MinChip, int betAmount = GameConfig.BetAmount)
  {
    var request = new CreateRoomRequest
    {
      type = "request_create_room",
      data = new CreatRoomDataRequest
      {
        minChip = minChip,
        betAmount = betAmount
      }
    };
    OnSend?.Invoke(request);
  }

  public static void RequestJoinRoom(int roomId)
  {
    var request = new JoinRoomRequest
    {
      type = "request_join_room",
      data = new RoomDataRequest
      {
        roomId = roomId.ToString()
      }
    };

    OnSend?.Invoke(request);
  }

  public static void RequestQuickJoinRoom()
  {
    var request = new QuickJoinRequest
    {
      type = "request_quick_join_room"
    };

    OnSend?.Invoke(request);
  }

  public static void RequestRoomSnapshot()
  {
    string msg = "{\"type\":\"request_room_snapshot\"}";
    OnSend?.Invoke(msg);
  }
  public static void RequestLeaveRoom()
  {
    string msg = "{\"type\":\"request_leave_room\"}";
    OnSend?.Invoke(msg);
  }

  public static void RequestSwapSeat(int fromSeat, int toSeat)
  {
    Debug.Log($"from: {fromSeat} to: {toSeat}");

    var request = new SwapSeatRequest
    {
      type = "request_swap_seat",
      data = new SwapSeatData
      {
        fromSeat = fromSeat,
        toSeat = toSeat
      }
    };

    OnSend?.Invoke(request);
  }

  public static void RequestSwapResponse(bool accept)
  {
    var request = new SwapResponseRequest
    {
      type = "request_swap_response",
      data = new SwapSeatResponsData()
      {
        accept = accept
      }
    };

    OnSend?.Invoke(request);
  }

  public static void RequestStartGame()
  {
    //var request = new StartGameRequest()
    //{
    //  type = "request_start_game"
    //};

    string msg = "{\"type\":\"request_start_game\"}";
    OnSend?.Invoke(msg);
  }

  public static void RequestPlayerReady()
  {
    string msg = "{\"type\":\"request_player_ready\"}";
    OnSend?.Invoke(msg);
  }

  public static void RequestHit()
  {
    var request = new HitRequest();
    OnSend?.Invoke(request);
  }

  public static void RequestStand()
  {
    var request = new StandRequest();
    OnSend?.Invoke(request);
  }

  public static void RequestClaimChip()
  {
    string msg = "{\"type\":\"request_claim_chip\"}";
    OnSend?.Invoke(msg);
  }

  public static void SendPlayCard(string cardId)
  {
    string msg = "{\"type\":\"play_card\",\"cardId\":\"" + cardId + "\"}";
    OnSend?.Invoke(msg);
  }

  public static void SendNameChange(string newName)
  {
    string msg = "{\"type\":\"name_change\",\"newName\":\"" + newName + "\"}";
    OnSend?.Invoke(msg);
  }
}