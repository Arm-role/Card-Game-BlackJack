using UnityEngine;

public class GameMainMenuLogic
{
  private int _roomId;
  private string _username;
  private string _password;

  public void OnUsernameChange(string value)
  {
    _username = value;
  }

  public void OnPasswordChange(string value)
  {
    _password = value;
  }

  public void OnLogin()
  {
    if (string.IsNullOrWhiteSpace(_username) ||
        string.IsNullOrWhiteSpace(_password))
    {
      Debug.LogWarning("Username or Password empty");
      return;
    }

    NetworkHelper.RequestLogin(_username, _password);
  }

  public void OnRegister()
  {
    if (string.IsNullOrWhiteSpace(_username) ||
        string.IsNullOrWhiteSpace(_password))
    {
      Debug.LogWarning("Username or Password empty");
      return;
    }

    NetworkHelper.RequestRegister(_username, _password);
  }

  public void OnRoomIDChange(string input)
  {
    if (int.TryParse(input, out int parsed))
    {
      _roomId = parsed;
    }
    else
    {
      _roomId = 0;
    }
  }

  public void OnCreateRoom()
  {
    if (!IsValidRoom())
    {
      Debug.LogWarning("Invalid Room ID");
      return;
    }

    NetworkHelper.RequestCreateRoom();
  }

  public void OnJoinRoom()
  {
    if (!IsValidRoom())
    {
      Debug.LogWarning("Invalid Room ID");
      return;
    }

    NetworkHelper.RequestJoinRoom(_roomId);
  }

  public void OnQuickJoinRoom()
  {
    NetworkHelper.RequestQuickJoinRoom();
  }

  public bool IsValidRoom()
  {
    return _roomId >= 0 && _roomId <= 999999;
  }
}