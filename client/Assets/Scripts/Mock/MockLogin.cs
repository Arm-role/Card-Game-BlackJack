// MockLogin.cs — เพิ่ม OnGUI สำหรับ manual test
using System.Collections;
using UnityEngine;

public class MockLogin : MonoBehaviour
{
  private GameMainMenuLogic _Logic = new GameMainMenuLogic();
  private string _username;
  private string _password = "123456789";
  private int _myPlayerId;
  private int _hostId;
  private int _minChip;

  private int _myChip;
  private int _betAmount;

  [SerializeField] private GameTableView _table;

  [Header("Test Config")]
  [SerializeField] private int _createRoomMinChip = 0;
  [SerializeField] private int _createRoomBetAmount = 100;

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

    _table.OnPlayAgainPressed += OnPlayAgain;
    _table.OnLeavePressed += OnLeaveRoom;
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
          _table.ShowLobby();
          State = ClientGameState.Authenticated;
          break;
      }
    }
    else
    {
      Debug.LogWarning($"[room] ❌ {msg.action} | reason={msg.reason}");
      switch (msg.reason)
      {
        case "INSUFFICIENT_CHIP":
          _table.ShowKickedMessage($"chip ไม่ถึง {_minChip:N0} — เข้าห้องไม่ได้");
          break;
        case "OUT_OF_CHIP":
          _table.ShowKickedMessage("chip หมดแล้ว — ถูกเตะออกจากห้อง");
          _table.ShowLobby();
          State = ClientGameState.Authenticated;
          Invoke(nameof(OnQuickJoinRoom), 2f);
          break;
        case "NOT_HOST":
          Debug.LogWarning("[room] คุณไม่ใช่ host");
          break;
      }
      if (msg.action == "quick_join") OnCreateRoom();
    }
  }

  private void OnRoomUpdateMessage(RoomUpdateMessage msg)
  {
    switch (msg.action)
    {
      case "snapshot":
        var r = msg.room;
        _hostId = r.hostId;
        _minChip = r.minChip;
        _betAmount = r.betAmount;
        Debug.Log($"[room_update] roomId={r.roomId} host={r.hostId} minChip={r.minChip:N0} bet={r.betAmount:N0} {r.player_count}/{r.max_player_count}");
        _table.UpdateHostUI(_myPlayerId == _hostId);
        _table.UpdateMinChipLabel(_minChip);
        _table.UpdateBetAmount(_betAmount);
        if (r.seats != null)
        {
          var mySeat = r.seats.Find(s => s.playerId == _myPlayerId);
          if (mySeat != null)
          {
            _myChip = mySeat.chip;
            _table.UpdateMyChip(_myChip);
          }
        }
        break;

      case "host_changed":
        _hostId = msg.hostChanged?.hostId ?? 0;
        Debug.Log($"[room_update] host_changed → {_hostId}");
        _table.UpdateHostUI(_myPlayerId == _hostId);
        if (_myPlayerId == _hostId) Debug.Log("⭐ คุณเป็น host ใหม่");
        break;

      case "players_kicked":
        var pk = msg.payload;
        if (pk?.kickedIds == null) break;
        foreach (var id in pk.kickedIds)
          Debug.Log($"[room_update] player {id} ถูกเตะ เหตุ: {pk.reason}");
        break;
    }
  }

  private void OnErrorMessage(ErrorMessage msg) =>
      Debug.LogError($"[error] {msg.reason}");

  private void OnGameResultMessage(GameResultMessage msg)
  {
    if (msg.success) return;
    Debug.LogWarning($"[game_result] ❌ {msg.action} {msg.reason}");
    if (msg.reason == "NOT_HOST")
      Debug.LogWarning("[game_result] คุณไม่ใช่ host");
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
        Debug.Log("[game_update] ready_to_act");
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
        _table.ShowGameplay();
        _table.SetMyPlayerId(_myPlayerId);
        _table.SetMyName(_username);
        StartCoroutine(DealAfterFrame(p));  // ← เปลี่ยนจากเรียกตรงๆ
        break;

      case "WAITING":
        State = ClientGameState.GameOver;
        _table.HideActionButtons();
        var snapshot = p;
        _table.RevealAllWhenReady(() =>
        {
          _table.RevealDealerAndShowResult(
            snapshot.dealer, snapshot.players, snapshot.results, _myPlayerId,
            results =>
            {
              if (results == null) return;
              foreach (var r in results)
              {
                Debug.Log($"  player[{r.playerId}] → {r.result}  chip={r.chipAfter:N0}");
                _table.ShowResult(r.playerId, r.result);
                if (r.playerId == _myPlayerId)
                {
                  _myChip = r.chipAfter;
                  _table.UpdateMyChip(_myChip);
                }
              }
            });
        });
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

  private void OnPlayAgain()
  {
    State = ClientGameState.InRoom;
    _table.ResetWhenReady(() =>
    {
      if (_myPlayerId == _hostId)
        NetworkHelper.RequestStartGame();
    });
  }

  private void OnLeaveRoom()
  {
    _table.ResetWhenReady(() =>
    {
      _table.ShowLobby();
      NetworkHelper.RequestLeaveRoom();
    });
  }

  private void OnGUI()
  {
    GUI.Label(new Rect(10, 10, 300, 25), $"State: {State}");
    GUI.Label(new Rect(10, 35, 300, 25), $"Animating: {_table.IsAnimating}");
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
  private IEnumerator DealAfterFrame(GameUpdatePayload p)
  {
    yield return null; // รอ 1 frame ให้ panel โผล่ก่อน
    _table.DealInitialCards(p.players, p.dealer, _myPlayerId, () =>
    {
      Debug.Log("[deal] done → RequestPlayerReady");
      _table.ShowWaitingForPlayers();
      NetworkHelper.RequestPlayerReady();
    });
  }
  private void OnCreateRoom() => NetworkHelper.RequestCreateRoom(true, _createRoomMinChip, _createRoomBetAmount);
  private void OnQuickJoinRoom() => _Logic.OnQuickJoinRoom();
}