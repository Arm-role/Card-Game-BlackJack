using System.Collections;
using UnityEngine;

public partial class MockLogin : MonoBehaviour
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
    _table.OnKickedDismissed += () => GameSceneManager.LoadScene("Login");
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
  // Debug / Helpers
  // =====================================================

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
