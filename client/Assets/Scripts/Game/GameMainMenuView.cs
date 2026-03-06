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
  [SerializeField] private Button _CreateRoom;
  [SerializeField] private Button _JoinRoom;
  [SerializeField] private Button _QuickJoinRoom;

  [Header("UI")]
  [SerializeField] private Button _RegisterUIButton;
  [SerializeField] private Button _JoinUIButton;

  private GameMainMenuLogic _Logic;

  private void Start()
  {
    _Logic = new GameMainMenuLogic();

    _Username.onValueChanged.AddListener(OnUsernameChange);
    _Password.onValueChanged.AddListener(OnPasswordChange);
    _Login.onClick.AddListener(OnLogin);
    _Register.onClick.AddListener(OnRegister);

    _RoomIDField.onValueChanged.AddListener(OnRoomIDChange);
    _CreateRoom.onClick.AddListener(OnCreateRoom);
    _JoinRoom.onClick.AddListener(OnJoinRoom);
    _QuickJoinRoom.onClick.AddListener(OnQuickJoinRoom);

    _RegisterUIButton.onClick.AddListener(OnGotoRegisterUI);
    _JoinUIButton.onClick.AddListener(OnGotoJoinUI);

    WSClient.Instance.Dispatcher
      .Register<RegisterResultMessage>("register_result", OnRegisterMessage);
    WSClient.Instance.Dispatcher
      .Register<LoginResultMessage>("login_result", OnLoginMessage);
    WSClient.Instance.Dispatcher
      .Register<RoomResultMessage>("room_result", OnRoomMessage);

    _UISwip.ActiveUIOnly("Login");
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
    Debug.Log(message);

    if (message.success)
      GameSceneManager.LoadScene("Lobby");
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

  private void OnCreateRoom()
  {
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

  private void OnGotoJoinUI()
  {
    _UISwip.ActiveUIOnly("Join");
  }
  private void OnGotoRegisterUI()
  {
    _UISwip.ActiveUIOnly("Register");
  }
}
