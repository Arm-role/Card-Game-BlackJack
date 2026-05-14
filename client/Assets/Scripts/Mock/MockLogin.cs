using UnityEngine;

// Dev-only: auto-authenticates and quick-joins without UI interaction.
// Production scenes use LoginSceneInstaller + LobbySceneInstaller instead.
public class MockLogin : MonoBehaviour
{
    private GameMainMenuLogic _logic;
    private GameplayLogic _gameplay;

    private string _username;
    private readonly string _password = "123456789";

    [SerializeField] private GameTableView _table;

    [Header("Test Config")]
    [SerializeField] private int _createRoomMinChip = 0;
    [SerializeField] private int _createRoomBetAmount = 100;

    private void Start()
    {
        _username = "Player_" + Random.Range(1000, 9999);

        var router = WSClient.Instance.Router;
        var sender = new NetworkHelper(WSClient.Instance);

        if (!GameState.Instance.IsInitialze)
            GameState.Instance.Initialze(router, GameInput.Instance);

        _logic = new GameMainMenuLogic(sender);

        _table.SetupNetworking(sender);
        _gameplay = new GameplayLogic(_table, router, _table, sender);
        _table.MarkGameplayWired(_gameplay);
        _table.OnPlayAgainPressed += _gameplay.OnPlayAgain;
        _table.OnLeavePressed += _gameplay.OnLeaveRoom;
        _table.OnKickedDismissed += () => GameSceneManager.LoadScene("Login");

        var d = WSClient.Instance.Dispatcher;
        WSClient.Instance.Dispatcher.OnWSConnected += OnAutoRegister;
        d.Register<RegisterResultMessage>("register_result", OnRegisterMessage);
        d.Register<LoginResultMessage>("login_result", OnLoginMessage);
        d.Register<RoomResultMessage>("room_result", OnRoomMessage);
    }

    // ─── Dev automation ───────────────────────────────────

    private void OnAutoRegister()
    {
        _logic.OnUsernameChange(_username);
        _logic.OnPasswordChange(_password);
        _logic.OnRegister();
    }

    private void OnRegisterMessage(RegisterResultMessage msg)
    {
        if (msg.success)
            _logic.OnQuickJoinRoom();
        else
        {
            _logic.OnUsernameChange(_username);
            _logic.OnPasswordChange(_password);
            _logic.OnLogin();
        }
    }

    private void OnLoginMessage(LoginResultMessage msg)
    {
        if (msg.success) _logic.OnQuickJoinRoom();
    }

    private void OnRoomMessage(RoomResultMessage msg)
    {
        if (!msg.success)
        {
            if (msg.reason == "INSUFFICIENT_CHIP")
            {
                var needed = msg.action == "create" ? _createRoomBetAmount : _gameplay.MinChip;
                _table.ShowKickedPanel($"chip ไม่ถึง {needed:N0} — เข้าห้องไม่ได้");
                return;
            }
            if (msg.action == "quick_join")
                _logic.OnCreateRoom(_createRoomMinChip, _createRoomBetAmount);
            return;
        }

        switch (msg.action)
        {
            case "create":
            case "join":
            case "quick_join":
                _gameplay.SetMyPlayerId(msg.seat?.playerId ?? 0);
                break;
        }
    }

    // ─── Dev overlay ──────────────────────────────────────

    private void OnGUI()
    {
        GUI.Label(new Rect(10, 10, 400, 25), $"[DEV] user={_username}  animating={_table.IsAnimating}");
    }
}
