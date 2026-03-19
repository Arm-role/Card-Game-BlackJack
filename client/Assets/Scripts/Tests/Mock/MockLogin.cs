using UnityEngine;

public class MockLogin : MonoBehaviour
{
  private GameMainMenuLogic _Logic = new GameMainMenuLogic();

  private string _username;
  private string _password = "123456789";

  private void Start()
  {
    _username = "Player_" + Random.Range(1000, 9999);

    WSClient.Instance.Dispatcher.OnWSConnected += OnRegister;

    WSClient.Instance.Dispatcher
      .Register<RegisterResultMessage>("register_result", OnRegisterMessage);
    WSClient.Instance.Dispatcher
      .Register<LoginResultMessage>("login_result", OnLoginMessage);
    WSClient.Instance.Dispatcher
      .Register<RoomResultMessage>("room_result", OnRoomMessage);
  }

  private void OnRegisterMessage(RegisterResultMessage message)
  {
    Debug.Log(message);
    if (message.success)
      OnQuickJoinRoom();
    else OnLogin();
  }

  private void OnLoginMessage(LoginResultMessage message)
  {
    Debug.Log(message);
    if (message.success)
      OnQuickJoinRoom();
  }


  private void OnRoomMessage(RoomResultMessage message)
  {
    Debug.Log($"Room action: {message.action} success: {message.success}");

    if (!message.success)
    {
      if (message.action == "quick_join")
        OnCreateRoom();

      return;
    }

    switch (message.action)
    {
      case "create":
      case "join":
      case "quick_join":
        Debug.Log("Entered room");
        break;

      case "leave":
        Debug.Log("Left room");
        break;
    }
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

  private void OnCreateRoom()
  {
    _Logic.OnCreateRoomShowCard();
  }
  private void OnQuickJoinRoom()
  {
    _Logic.OnQuickJoinRoom();
  }
}
