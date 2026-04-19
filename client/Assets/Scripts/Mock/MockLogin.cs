using UnityEngine;

public class MockLogin : MonoBehaviour
{
  private GameMainMenuLogic _Logic = new GameMainMenuLogic();

  private string _username;
  private string _password = "123456789";

  private void Start()
  {
    _username = "Player_" + Random.Range(1000, 9999);

    var dispatcher = WSClient.Instance.Dispatcher;

    WSClient.Instance.Dispatcher.OnWSConnected += OnRegister;

    dispatcher.Register<RegisterResultMessage>("register_result", OnRegisterMessage);
    dispatcher.Register<LoginResultMessage>("login_result", OnLoginMessage);

    dispatcher.Register<RoomResultMessage>("room_result", OnRoomMessage);
    dispatcher.Register<GameEventMessage>("game_event", OnGameEventMessage);
    //dispatcher.Register<GameUpdateMessage>("game_update", OnGameUpdate);
  }

  private void Update()
  {
    if (Input.GetKeyDown(KeyCode.Q))
    {
      NetworkHelper.RequestStartGame();
    }

    if (Input.GetKeyDown(KeyCode.A))
    {
      NetworkHelper.RequestPlayerReady();
    }

    if (Input.GetKeyDown(KeyCode.W))
    {
      NetworkHelper.RequestHit();
    }

    if (Input.GetKeyDown(KeyCode.E))
    {
      NetworkHelper.RequestStand();
    }
  }

  #region Response

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

  private void OnGameEventMessage(GameEventMessage message)
  {
    Debug.Log(message.type);
    Debug.Log(message.action);

    if (message.action == "player_hit")
    {
      if (message.payload != null)
      {
        Debug.Log($"player_id : {message.payload?.player_id}");
        Debug.Log($"status : {message.payload?.status}");
        Debug.Log($"card : {message.payload?.card?.suit}{message.payload?.card?.rank}");
        Debug.Log($"score : {message.payload?.score}");
      }
    }
    else if (message.action == "player_stand")
    {
      if (message.payload != null)
      {
        Debug.Log($"player_id : {message.payload?.player_id}");
        Debug.Log($"status : {message.payload?.status}");
      }
    }
  }


  private void OnGameUpdate(GameUpdateMessage message)
  {
    Debug.Log(message.type);
    Debug.Log(message.action);

    if (message.payload != null)
    {
      Debug.Log(message.payload.roomId);
      Debug.Log(message.payload.state);
    }
  }

  private void OnGameResult(GameResultMessage message)
  {
    Debug.Log(message.type);
    Debug.Log(message.action);
    Debug.Log(message.success);

    if (!message.success)
    {
      Debug.Log(message.reason);
    }
  }

  #endregion

  #region Request
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

  #endregion
}