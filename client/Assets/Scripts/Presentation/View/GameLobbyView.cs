using TMPro;
using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

public class GameLobbyView : MonoBehaviour
{
  [Header("Setup")]
  [SerializeField] private UserViewUI _view;
  [SerializeField] private SeatSwapViewUI _swapView;

  [Header("Room")]
  [SerializeField] private TextMeshProUGUI _RoomPlayersText;
  [SerializeField] private TextMeshProUGUI _RoomUsersText;
  [SerializeField] private TextMeshProUGUI _RoomIDText;
  [SerializeField] private Button[] _LeaveButtons;

  private LobbyService _Serviec;

  public void Initialze(LobbyService lobbySystem)
  {
    _Serviec = lobbySystem;

    foreach (var leaveButton in _LeaveButtons)
      leaveButton.onClick.AddListener(OnLeaveClicked);

    _Serviec.OnRoomUpdated += HandleRoomUpdated;
    _Serviec.OnSeatUpdated += HandleSeatUpdated;
    _Serviec.OnSwapRequest += _swapView.Setup;
    _Serviec.OnRoomClosed += HandleRoomClosed;
    _view.OnSeatClicked += OnSeatClicked;

    _Serviec.RequestRoomData();
  }

  private void OnLeaveClicked()
  {
    _Serviec.LeaveRoom();
  }

  private void HandleRoomClosed()
  {
    GameSceneManager.LoadScene("Login");
  }

  private void HandleRoomUpdated(RoomData room)
  {
    foreach (var seat in room.seats)
    {
      Debug.Log($"{seat.seatIndex} {seat.role}");
    }
    RefreshUI(room);
  }

  private void HandleSeatUpdated(IReadOnlyDictionary<int, SeatData> seats)
  {
    _view.SetSeats(seats);
  }

  private void RefreshUI(RoomData room)
  {
    if (room == null)
    {
      _RoomIDText.text = "-";
      _RoomPlayersText.text = "Not in room";
      foreach (var leaveButton in _LeaveButtons)
        leaveButton.interactable = false;
      return;
    }

    _RoomIDText.text = $"Room: {room.roomId}";

    _RoomPlayersText.text = $"Players: {room.player_count}/{room.max_player_count}";
    _RoomUsersText.text = $"Users in room: {room.user_count}";
    foreach (var leaveButton in _LeaveButtons)
      leaveButton.interactable = true;
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