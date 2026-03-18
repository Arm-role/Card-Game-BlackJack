using TMPro;
using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

public class GameLobbyView : MonoBehaviour
{
  [Header("Setup")]
  [SerializeField] private UserViewUI _view;

  [Header("Room")]
  [SerializeField] private TextMeshProUGUI _RoomListText;
  [SerializeField] private TextMeshProUGUI _RoomIDText;
  [SerializeField] private Button _LeaveButton;

  private readonly List<PlayerLobbyView> _spawnedPlayers = new();

  private LobbyService _Serviec;

  private int _maxPlayers;

  public void Initialze(LobbyService lobbySystem)
  {
    _Serviec = lobbySystem;

    _LeaveButton.onClick.AddListener(OnLeaveClicked);

    _Serviec.OnRoomUpdated += HandleRoomUpdated;
    _Serviec.OnSeatUpdated += _view.SetSeats;
    _view.OnSeatClicked += OnSeatClicked;
  }

  private void OnLeaveClicked()
  {
    _Serviec.LeaveRoom();
  }

  private void HandleRoomUpdated(RoomData room)
  {
    RefreshUI(room);
  }

  private void RefreshUI(RoomData room)
  {
    if (room == null)
    {
      _RoomIDText.text = "-";
      _RoomListText.text = "Not in room";
      _LeaveButton.interactable = false;
      return;
    }

    _maxPlayers = room.max_player_count;

    _RoomIDText.text = $"Room: {room.roomId}";
    _RoomListText.text = $"Players: {room.seats.Count}/{_maxPlayers}";
    _LeaveButton.interactable = true;

  }
  private void OnSeatClicked(int targetSeat)
  {
    int mySeat = GameState.Instance.GetMySeatIndex();

    Debug.Log(mySeat);

    if (mySeat == -1)
    {
      _Serviec.RequestSwapSeat(targetSeat, targetSeat);
      return;
    }

    if (mySeat == targetSeat)
    {
      Debug.Log("Clicked own seat");
      return;
    }

    _Serviec.RequestSwapSeat(mySeat, targetSeat);
  }
}