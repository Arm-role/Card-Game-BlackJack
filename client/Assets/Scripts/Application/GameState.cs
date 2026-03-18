using System;
using UnityEngine;

public class GameState : MonoBehaviour
{
  public static GameState Instance { get; private set; }

  public int seatIndex;
  public SeatRole role;

  public int playerId;
  public string username;
  public int chip;

  public SeatData MySeatData { get; private set; }
  public RoomData CurrentRoom { get; private set; }

  private void Awake()
  {
    if (Instance != null)
    {
      Destroy(gameObject);
      return;
    }

    Instance = this;
    DontDestroyOnLoad(gameObject);
  }

  public void Initialze(IWSClient client, IGameInput gameInput)
  {
    client.Dispatcher.Register<RoomUpdateMessage>("room_update", OnRoomUpdate);
    client.Dispatcher.Register<RoomResultMessage>("room_result", OnRoomResult);

    gameInput.OnInputTastA += TestClickA;
    gameInput.OnInputTastB += TestClickB;
  }

  private void SetMyPlayer(SeatData seat)
  {
    MySeatData = seat;
    Debug.Log(seat.seatIndex);
    Debug.Log(seat.role);
    Debug.Log(seat.playerId);
    Debug.Log(seat.username);
    Debug.Log(seat.chip);

    seatIndex = seat.seatIndex;
    role = seat.role;
    playerId = seat.playerId;
    username = seat.username;
    chip = seat.chip;
  }

  public int GetMySeatIndex()
  {
    if (CurrentRoom == null) return -1;

    foreach (var seat in CurrentRoom.seats)
    {
      Debug.Log(seat.playerId);
      Debug.Log(MySeatData.playerId);

      if (seat.playerId == MySeatData.playerId)
        return seat.seatIndex;
    }

    return -1;
  }

  private void OnRoomResult(RoomResultMessage message)
  {
    if (!message.success) return;

    switch (message.action)
    {
      case "create":
      case "join":
      case "quick_join":
        SetMyPlayer(message.seat);
        break;

      case "leave":
        ClearRoom();
        GameSceneManager.LoadScene("Login");
        break;

    }
  }

  private void OnRoomUpdate(RoomUpdateMessage message)
  {
    Debug.Log(message.action);

    switch (message.action)
    {
      case "snapshot":
        CurrentRoom = message.room;
        break;

      case "swap_request":
        var payload = message.seatSwap;
        Debug.Log(payload.fromPlayerId);
        Debug.Log(payload.fromSeat);
        Debug.Log(payload.toSeat);
        isSwapRequest = true;
        break;

        //case "player_joined":
        //  PlayerJoinRoom(message.player);
        //  break;
    }
  }

  public void ClearRoom()
  {
    MySeatData = null;
    CurrentRoom = null;
  }

  bool isSwapRequest = false;
  private void TestClickA()
  {
    if (!isSwapRequest) return;
    NetworkHelper.RequestSwapResponse(true);
    isSwapRequest = false;
  }

  private void TestClickB()
  {
    if (!isSwapRequest) return;
    NetworkHelper.RequestSwapResponse(false);
    isSwapRequest = false;
  }
}