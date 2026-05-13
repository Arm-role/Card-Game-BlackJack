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
  [SerializeField] private TextMeshProUGUI _ErrorText;

  private GameMainMenuLogic _Logic;

  private void Start()
  {
    _Logic = new GameMainMenuLogic();

    _Username.onValueChanged.AddListener(OnUsernameChange);
    _Password.onValueChanged.AddListener(OnPasswordChange);
    _Login.onClick.AddListener(OnLogin);
    _Register.onClick.AddListener(OnRegister);

    _RoomIDField.onValueChanged.AddListener(OnRoomIDChange);

    if (_createRoomPanel != null)
      _createRoomPanel.OnConfirmed += bet => _Logic.OnCreateRoom(bet);
    _JoinRoom.onClick.AddListener(OnJoinRoom);
    _QuickJoinRoom.onClick.AddListener(OnQuickJoinRoom);

    _RegisterUIButton.onClick.AddListener(OnGotoRegisterUI);
    _LoginUIButton.onClick.AddListener(OnGotoLoginUI);
    if (_CreateUIButton != null)
      _CreateUIButton.onClick.AddListener(OnCreateRoomClicked);
    _JoinUIButton.onClick.AddListener(OnGotoJoinUI);

    if (GameState.Instance.AccountUsername != null)
    {
      _UISwip.ActiveUIOnly("Mode");
    }
    else
    {
      _UISwip.ActiveUIOnly("Login");
    }
  }


  public void Initialze(IWSClient wSClient)
  {
    wSClient.Dispatcher
     .Register<RegisterResultMessage>("register_result", OnRegisterMessage);
    wSClient.Dispatcher
      .Register<LoginResultMessage>("login_result", OnLoginMessage);
    wSClient.Dispatcher
      .Register<RoomResultMessage>("room_result", OnRoomMessage);
  }

  private void OnRegisterMessage(RegisterResultMessage message)
  {
    Debug.Log(message);
    if (message.success)
      _UISwip.ActiveUIOnly("Mode");
  }

  private void OnLoginMessage(LoginResultMessage message)
  {
    Debug.Log(message);

    if (message.success)
      _UISwip.ActiveUIOnly("Mode");
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


  private void OnUsernameChange(string value)
  {
    _Logic.OnUsernameChange(value);
  }

  private void OnPasswordChange(string value)
  {
    _Logic.OnPasswordChange(value);
  }

  private void OnLogin()
  {
    _Logic.OnLogin();
  }

  private void OnRegister()
  {
    _Logic.OnRegister();
  }



  private void OnRoomIDChange(string input)
  {
    _Logic.OnRoomIDChange(input);
  }

  private void OnCreateRoomClicked()
  {
    if (_createRoomPanel != null)
      _createRoomPanel.Show();
    else
      _Logic.OnCreateRoom();
  }
  private void OnJoinRoom()
  {
    _Logic.OnJoinRoom();
  }

  private void OnQuickJoinRoom()
  {
    _Logic.OnQuickJoinRoom();
  }


  private void OnGotoRegisterUI()
  {
    _UISwip.ActiveUIOnly("Register");
  }
  private void OnGotoLoginUI()
  {
    _UISwip.ActiveUIOnly("Login");
  }

  private void OnGotoJoinUI()
  {
    _UISwip.ActiveUIOnly("Join");
  }

}
