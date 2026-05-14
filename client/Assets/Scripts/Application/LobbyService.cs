using System;
using System.Collections.Generic;
using UnityEngine;

public class LobbyService
{
  private readonly LobbyDomain _domain;
  private readonly INetworkSender _sender;

  public event Action<IReadOnlyDictionary<int, SeatData>> OnSeatUpdated
  {
    add => _domain.OnSeatUpdated += value;
    remove => _domain.OnSeatUpdated -= value;
  }

  public event Action<RoomData> OnRoomUpdated;
  public event Action<SeatSwapData> OnSwapRequest;
  public event Action OnRoomClosed;

  public LobbyService(LobbyDomain domain, IMessageRouter router, INetworkSender sender)
  {
    _domain = domain;
    _sender = sender;

    router.OnRoomUpdate += OnRoomUpdate;
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

      case "room_closed":
        OnRoomClosed?.Invoke();
        break;
    }
  }

  //-----------Sub Get----------//

  private void SyncFromServer(RoomData room)
  {
    if (room == null)
    {
      Debug.LogError("RoomData is null");
      return;
    }

    _domain.SetFromSnapshot(room);
    OnRoomUpdated?.Invoke(room);
  }

  //-----------Request----------//
  public void RequestRoomData()
  {
    if (GameState.Instance.CurrentRoom != null)
      SyncFromServer(GameState.Instance.CurrentRoom);
  }

  public void RequestSwapSeat(int fromSeat, int toSeat)
  {
    _sender.RequestSwapSeat(fromSeat, toSeat);
  }

  public void StartGame()
  {
    if (_domain.CanStartGame())
      _sender.RequestStartGame();
  }

  public void LeaveRoom()
  {
    _sender.RequestLeaveRoom();
  }
}