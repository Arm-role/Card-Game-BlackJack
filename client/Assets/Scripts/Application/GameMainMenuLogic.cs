using UnityEngine;

public class GameMainMenuLogic
{
  private readonly INetworkSender _sender;

  private int _roomId;
  private string _username;
  private string _password;

  public GameMainMenuLogic(INetworkSender sender)
  {
    _sender = sender;
  }

  public void OnUsernameChange(string value) => _username = value;
  public void OnPasswordChange(string value) => _password = value;

  public void OnLogin()
  {
    if (string.IsNullOrWhiteSpace(_username) || string.IsNullOrWhiteSpace(_password))
    {
      Debug.LogWarning("Username or Password empty");
      return;
    }
    _sender.RequestLogin(_username, _password);
  }

  public void OnRegister()
  {
    if (string.IsNullOrWhiteSpace(_username) || string.IsNullOrWhiteSpace(_password))
    {
      Debug.LogWarning("Username or Password empty");
      return;
    }
    _sender.RequestRegister(_username, _password);
  }

  public void OnRoomIDChange(string input)
  {
    _roomId = int.TryParse(input, out int parsed) ? parsed : 0;
  }

  public void OnCreateRoom(int minChip = GameConfig.MinChip, int betAmount = GameConfig.BetAmount)
  {
    _sender.RequestCreateRoom(minChip, betAmount);
  }

  public void OnJoinRoom()
  {
    if (!IsValidRoom())
    {
      Debug.LogWarning("Invalid Room ID");
      return;
    }
    _sender.RequestJoinRoom(_roomId);
  }

  public void OnQuickJoinRoom() => _sender.RequestQuickJoinRoom();

  public bool IsValidRoom() => _roomId >= 0 && _roomId <= 999999;
}
