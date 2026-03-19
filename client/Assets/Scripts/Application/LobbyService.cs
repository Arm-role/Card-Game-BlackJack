using System;
using System.Collections.Generic;
using UnityEngine;

public class LobbyService
{
  private readonly LobbyDomain _domain;
  private readonly IWSClient _client;

  public event Action<IReadOnlyList<SeatData>> OnSeatUpdated
  {
    add => _domain.OnSeatUpdated += value;
    remove => _domain.OnSeatUpdated -= value;
  }

  public event Action<RoomData> OnRoomUpdated;
  public event Action<SeatSwapData> OnSwapRequest;

  public LobbyService(LobbyDomain domain, IWSClient client)
  {
    _domain = domain;
    _client = client;

    _client.Dispatcher.Register<RoomUpdateMessage>("room_update", OnRoomUpdate);
    Debug.Log("LobbyServiec Register");
  }

  //-----------Get----------//

  private void OnRoomUpdate(RoomUpdateMessage message)
  {
    Debug.Log(message.action);

    switch (message.action)
    {
      case "snapshot":
        SyncFromServer(message.room);
        break;

      case "swap_request":
        OnSwapRequest?.Invoke(message.seatSwap);
        break;
    }
  }

  //-----------Sub Get----------//

  private void SyncFromServer(RoomData room)
  {
    _domain.SetFromSnapshot(room);
    OnRoomUpdated?.Invoke(room);
  }

  //-----------Request----------//
  public void RequestRoomData()
  {
    if (GameState.Instance.CurrentRoom != null)
      SyncFromServer(GameState.Instance.CurrentRoom);
  }

  public void RequestSwapSeat(int selectedSeat, int index)
  {
    NetworkHelper.RequestSwapSeat(selectedSeat, index);
  }

  public void StartGame()
  {
    if (_domain.CanStartGame())
      NetworkHelper.RequestStartGame();
  }
  public void LeaveRoom()
  {
    NetworkHelper.RequestLeaveRoom();
  }
}