using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class GameLobbyView : MonoBehaviour
{
  [Header("Setup")]
  [SerializeField] private PlayerLobbyView _PlayerPrefab;

  [Header("Modules")]
  [SerializeField] private SpawnerHandle _Spawner;

  [Header("Room")]
  [SerializeField] private Transform _PlayerParent;
  [SerializeField] private TextMeshProUGUI _RoomListText;
  [SerializeField] private TextMeshProUGUI _RoomIDText;
  [SerializeField] private Button _LeaveButton;

  private readonly List<PlayerLobbyView> _spawnedPlayers = new();
  private LobbySystem _lobbySystem;

  private void Start()
  {
    _lobbySystem = new LobbySystem(GameState.Instance, WSClient.Instance);

    GameState.Instance.OnRoomUpdated += HandleRoomUpdated;

    _LeaveButton.onClick.AddListener(OnLeaveClicked);

    RefreshUI(GameState.Instance.CurrentRoom);
  }

  private void OnDestroy()
  {
    if (GameState.Instance != null)
      GameState.Instance.OnRoomUpdated -= HandleRoomUpdated;
  }

  private void OnLeaveClicked()
  {
    _lobbySystem.LeaveRoom();
  }

  private void HandleRoomUpdated(RoomData room)
  {
    RefreshUI(room);
  }

  private void RefreshUI(RoomData room)
  {
    ClearPlayers();

    if (room == null)
    {
      _RoomIDText.text = "-";
      _RoomListText.text = "Not in room";
      _LeaveButton.interactable = false;
      return;
    }

    _RoomIDText.text = $"Room: {room.roomId}";
    _RoomListText.text = $"Players: {room.players.Count}/{room.max_player_count}";
    _LeaveButton.interactable = true;

    foreach (var player in room.players)
    {
      var view = _Spawner.Spawn(_PlayerPrefab, _PlayerParent);
      view.Setup(player.username, player.chip);
      _spawnedPlayers.Add(view);
    }
  }

  private void ClearPlayers()
  {
    foreach (var view in _spawnedPlayers)
    {
      if (view != null)
        _Spawner.Despawn(view.gameObject);
    }

    _spawnedPlayers.Clear();
  }
}