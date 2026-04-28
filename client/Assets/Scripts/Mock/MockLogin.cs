// =====================================================
// MockLogin.cs
// =====================================================
using UnityEngine;

public class MockLogin : MonoBehaviour
{
  private GameMainMenuLogic _Logic = new GameMainMenuLogic();
  private string _username;
  private string _password = "123456789";
  private int _myPlayerId;

  [SerializeField] private GameTableView _table;

  private ClientGameState _state = ClientGameState.Disconnected;
  private ClientGameState State
  {
    get => _state;
    set { Debug.Log($"[State] {_state} → {value}"); _state = value; }
  }

  private void Start()
  {
    _username = "Player_" + Random.Range(1000, 9999);
    var d = WSClient.Instance.Dispatcher;
    WSClient.Instance.Dispatcher.OnWSConnected += OnRegister;

    d.Register<RegisterResultMessage>("register_result", OnRegisterMessage);
    d.Register<LoginResultMessage>("login_result", OnLoginMessage);
    d.Register<RoomResultMessage>("room_result", OnRoomMessage);
    d.Register<RoomUpdateMessage>("room_update", OnRoomUpdateMessage);
    d.Register<ErrorMessage>("error", OnErrorMessage);
    d.Register<GameResultMessage>("game_result", OnGameResultMessage);
    d.Register<GameEventMessage>("game_event", OnGameEventMessage);
    d.Register<GameUpdateMessage>("game_update", OnGameUpdateMessage);
  }

  // =====================================================
  // Auth
  // =====================================================

  private void OnRegisterMessage(RegisterResultMessage msg)
  {
    if (msg.success)
    {
      Debug.Log($"[register] ✅ {msg.username}");
      State = ClientGameState.Authenticated;
      OnQuickJoinRoom();
    }
    else
    {
      Debug.LogWarning($"[register] ❌ {msg.reason}");
      OnLogin();
    }
  }

  private void OnLoginMessage(LoginResultMessage msg)
  {
    if (msg.success)
    {
      Debug.Log($"[login] ✅ {msg.username}");
      State = ClientGameState.Authenticated;
      OnQuickJoinRoom();
    }
    else Debug.LogWarning($"[login] ❌ {msg.reason}");
  }

  // =====================================================
  // Room
  // =====================================================

  private void OnRoomMessage(RoomResultMessage msg)
  {
    if (msg.success)
    {
      switch (msg.action)
      {
        case "create":
        case "join":
        case "quick_join":
          _myPlayerId = msg.seat?.playerId ?? 0;
          Debug.Log($"[room] ✅ Entered | myId={_myPlayerId}");
          State = ClientGameState.InRoom;
          break;
        case "leave":
          State = ClientGameState.Authenticated;
          break;
      }
    }
    else
    {
      Debug.LogWarning($"[room] ❌ {msg.action} {msg.reason}");
      if (msg.action == "quick_join") OnCreateRoom();
    }
  }

  private void OnRoomUpdateMessage(RoomUpdateMessage msg)
  {
    if (msg.action != "snapshot") return;
    Debug.Log($"[room_update] {msg.room?.roomId} {msg.room?.player_count}/{msg.room?.max_player_count}");
  }

  private void OnErrorMessage(ErrorMessage msg) =>
      Debug.LogError($"[error] {msg.reason}");

  private void OnGameResultMessage(GameResultMessage msg)
  {
    if (!msg.success)
      Debug.LogWarning($"[game_result] ❌ {msg.action} {msg.reason}");
  }

  // =====================================================
  // Game Update
  // =====================================================

  private void OnGameUpdateMessage(GameUpdateMessage msg)
  {
    switch (msg.action)
    {
      case "start":
        Debug.Log($"[game_update] start roomId={msg.payload?.roomId}");
        break;

      case "state_changed":
        HandleStateChanged(msg.payload);
        break;

      case "ready_to_act":
        _table.HideWaitingForPlayers();
        State = ClientGameState.WaitingTurn;
        Debug.Log("[game_update] ready_to_act — all players ready");
        break;

      case "turn_changed":
        HandleTurnChanged(msg.payload?.currentPlayer ?? 0);
        break;
    }
  }

  private void HandleStateChanged(GameUpdatePayload p)
  {
    if (p == null) return;
    Debug.Log($"[state_changed] {p.state}");

    switch (p.state)
    {
      case "DEALING":
        if (p.players == null || p.dealer == null) return;
        State = ClientGameState.Dealing;

        _table.SetMyPlayerId(_myPlayerId);
        _table.SetMyName(_username);

        _table.DealInitialCards(
            p.players, p.dealer, _myPlayerId,
            onComplete: () =>
            {
              Debug.Log("[deal] done → RequestPlayerReady");
              _table.ShowWaitingForPlayers();
              NetworkHelper.RequestPlayerReady();
            });
        break;

      case "WAITING":
        State = ClientGameState.GameOver;

        // เปิดไพ่ทั้งหมด + แสดง score จริง
        _table.RevealAll(p.players, p.dealer);
        _table.HideActionButtons();

        if (p.results != null)
          foreach (var r in p.results)
            Debug.Log($"  player[{r.playerId}] → {r.result}");

        Invoke(nameof(ResetAfterGame), 3f);
        break;
    }
  }

  private void HandleTurnChanged(int currentPlayer)
  {
    Debug.Log($"[turn_changed] currentPlayer={currentPlayer}");
    _table.SetTurn(currentPlayer);

    if (currentPlayer == _myPlayerId)
    {
      State = ClientGameState.MyTurn;
      _table.ShowActionButtons();
      Debug.Log("⭐ YOUR TURN");
    }
    else
    {
      State = ClientGameState.WaitingTurn;
      _table.HideActionButtons();
    }
  }

  // =====================================================
  // Game Event
  // =====================================================

  private void OnGameEventMessage(GameEventMessage msg)
  {
    switch (msg.action)
    {
      case "player_hit":
        var h = msg.payload;
        if (h?.card == null) return;
        Debug.Log($"[player_hit] player={h.player_id} {h.card} score={h.score} status={h.status}");

        _table.AddCard(h.card, h.score, h.player_id);

        if (h.player_id == _myPlayerId && h.status == "BUST")
        {
          Debug.Log("💥 BUST");
          _table.HideActionButtons();
        }
        break;

      case "player_stand":
        var s = msg.payload;
        Debug.Log($"[player_stand] player={s.player_id}");
        if (s.player_id == _myPlayerId)
          _table.HideActionButtons();
        break;
    }
  }

  // =====================================================
  // Helpers
  // =====================================================

  private void ResetAfterGame()
  {
    _table.ResetTable();
    State = ClientGameState.InRoom;
    Debug.Log("[reset] Ready for next round");
  }

  private void OnLogin()
  {
    _Logic.OnUsernameChange(_username);
    _Logic.OnPasswordChange(_password);
    _Logic.OnLogin();
  }

  private void OnRegister()
  {
    _Logic.OnUsernameChange(_username);
    _Logic.OnPasswordChange(_password);
    _Logic.OnRegister();
  }

  private void OnCreateRoom() => _Logic.OnCreateRoomShowCard();
  private void OnQuickJoinRoom() => _Logic.OnQuickJoinRoom();
}