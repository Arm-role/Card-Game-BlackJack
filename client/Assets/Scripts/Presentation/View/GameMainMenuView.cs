using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class GameMainMenuView : MonoBehaviour
{
  [Header("Modules")]
  [SerializeField] private UISwip _UISwip;

  [Header("Account")]
  [SerializeField] private TMP_InputField _Username;
  [SerializeField] private TMP_InputField _Password;
  [SerializeField] private Button _Login;
  [SerializeField] private Button _Register;

  [Header("Room")]
  [SerializeField] private TMP_InputField _RoomIDField;
  [SerializeField] private Button _JoinRoom;
  [SerializeField] private Button _QuickJoinRoom;
  [SerializeField] private CreateRoomPanel _createRoomPanel;

  [Header("UI")]
  [SerializeField] private Button _RegisterUIButton;
  [SerializeField] private Button _LoginUIButton;
  [SerializeField] private Button _CreateUIButton;
  [SerializeField] private Button _JoinUIButton;
  [SerializeField] private Button _BackFromModeButton;
  [SerializeField] private Button _BackFromJoinButton;
  [SerializeField] private TextMeshProUGUI _ErrorText;

  private GameMainMenuLogic _Logic;
  private IMessageRouter _router;

  private void Awake()
  {
    _Username.onValueChanged.AddListener(v => _Logic?.OnUsernameChange(v));
    _Password.onValueChanged.AddListener(v => _Logic?.OnPasswordChange(v));
    _Login.onClick.AddListener(() => _Logic?.OnLogin());
    _Register.onClick.AddListener(() => _Logic?.OnRegister());
    _RoomIDField.onValueChanged.AddListener(v => _Logic?.OnRoomIDChange(v));

    if (_createRoomPanel != null)
      _createRoomPanel.OnConfirmed += bet => _Logic?.OnCreateRoom(betAmount: bet);
    _JoinRoom.onClick.AddListener(() => _Logic?.OnJoinRoom());
    _QuickJoinRoom.onClick.AddListener(() => _Logic?.OnQuickJoinRoom());

    _RegisterUIButton.onClick.AddListener(() => _UISwip.ActiveUIOnly("Register"));
    _LoginUIButton.onClick.AddListener(() => _UISwip.ActiveUIOnly("Login"));
    if (_CreateUIButton != null)
      _CreateUIButton.onClick.AddListener(OnCreateRoomClicked);
    _JoinUIButton.onClick.AddListener(() => _UISwip.ActiveUIOnly("Join"));
    if (_BackFromModeButton != null)
      _BackFromModeButton.onClick.AddListener(() =>
      {
        GameState.Instance.Logout();
        _UISwip.ActiveUIOnly("Login");
      });
    if (_BackFromJoinButton != null)
      _BackFromJoinButton.onClick.AddListener(() => _UISwip.ActiveUIOnly("Mode"));
  }

  public void Initialze(IMessageRouter router, INetworkSender sender)
  {
    _Logic = new GameMainMenuLogic(sender);
    _router = router;

    _UISwip.ActiveUIOnly(GameState.Instance.AccountUsername != null ? "Mode" : "Login");

    _router.OnRegisterResult += OnRegisterMessage;
    _router.OnLoginResult    += OnLoginMessage;
    _router.OnRoomResult     += OnRoomMessage;
  }

  private void OnDestroy()
  {
    if (_router == null) return;
    _router.OnRegisterResult -= OnRegisterMessage;
    _router.OnLoginResult    -= OnLoginMessage;
    _router.OnRoomResult     -= OnRoomMessage;
  }

  private void OnRegisterMessage(RegisterResultMessage message)
  {
    if (message.success) _UISwip.ActiveUIOnly("Mode");
  }

  private void OnLoginMessage(LoginResultMessage message)
  {
    if (message.success) _UISwip.ActiveUIOnly("Mode");
  }

  private void OnRoomMessage(RoomResultMessage message)
  {
    if (!message.success)
    {
      ShowError(message.reason);
      return;
    }
    switch (message.action)
    {
      case "create":
      case "join":
      case "quick_join":
        ClearError();
        GameSceneManager.LoadScene("Lobby");
        break;
    }
  }

  private void ShowError(string reason)
  {
    if (_ErrorText == null) return;
    _ErrorText.text = reason switch
    {
      "INSUFFICIENT_CHIP" => "chip ไม่พอ — กด Claim เพื่อรับ chip",
      "ROOM_NOT_FOUND"    => "ไม่พบห้อง",
      "ROOM_FULL"         => "ห้องเต็ม",
      "NO_AVAILABLE_ROOM" => "ไม่มีห้องว่าง",
      _                   => reason
    };
  }

  private void ClearError()
  {
    if (_ErrorText) _ErrorText.text = "";
  }

  private void OnCreateRoomClicked()
  {
    if (_createRoomPanel != null) _createRoomPanel.Show();
    else _Logic?.OnCreateRoom();
  }
}
