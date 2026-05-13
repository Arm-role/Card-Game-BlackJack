using UnityEngine;

public class MockLogin : MonoBehaviour
{
  private GameMainMenuLogic _Logic = new GameMainMenuLogic();
  private GameplayLogic _gameplay;

  private string _username;
  private string _password = "123456789";

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
    _gameplay = new GameplayLogic(this, WSClient.Instance, _table);
    _table.MarkGameplayWired();

    var d = WSClient.Instance.Dispatcher;
    WSClient.Instance.Dispatcher.OnWSConnected += OnRegister;

    d.Register<RegisterResultMessage>("register_result", OnRegisterMessage);
    d.Register<LoginResultMessage>("login_result", OnLoginMessage);
    d.Register<RoomResultMessage>("room_result", OnRoomMessage);

    _table.OnPlayAgainPressed += _gameplay.OnPlayAgain;
    _table.OnLeavePressed += _gameplay.OnLeaveRoom;
    _table.OnKickedDismissed += () => GameSceneManager.LoadScene("Login");
  }

  // ─── Auth ─────────────────────────────────────────────

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

  // ─── Room Entry / Leave ───────────────────────────────

  private void OnRoomMessage(RoomResultMessage msg)
  {
    if (msg.success)
    {
      switch (msg.action)
      {
        case "create":
        case "join":
        case "quick_join":
          State = ClientGameState.InRoom;
          Debug.Log($"[room] ✅ Entered | myId={msg.seat?.playerId}");
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
          var needed = msg.action == "create" ? _createRoomBetAmount : _gameplay.MinChip;
          _table.ShowKickedPanel($"chip ไม่ถึง {needed:N0} — เข้าห้องไม่ได้");
          return;
        case "NOT_HOST":
          Debug.LogWarning("[room] คุณไม่ใช่ host");
          break;
      }
      if (msg.action == "quick_join") OnCreateRoom();
    }
  }

  // ─── Debug / Helpers ──────────────────────────────────

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

  private void OnCreateRoom() => NetworkHelper.RequestCreateRoom(true, _createRoomMinChip, _createRoomBetAmount);
  private void OnQuickJoinRoom() => _Logic.OnQuickJoinRoom();
}
