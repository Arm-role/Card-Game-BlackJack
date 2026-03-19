using UnityEngine;

public class GameState : MonoBehaviour
{
  public static GameState Instance { get; private set; }
  public string? AccountUsername { get; private set; }
  public SeatData MySeatData { get; private set; }
  public RoomData CurrentRoom { get; private set; }

  private void Awake()
  {
    if (Instance != null)
    {
      Destroy(gameObject);
      return;
    }

    Instance = this;
    DontDestroyOnLoad(gameObject);
  }

  public void Initialze(IWSClient client, IGameInput gameInput)
  {
    client.Dispatcher.Register<RegisterResultMessage>("register_result", OnRegisterResult);
    client.Dispatcher.Register<LoginResultMessage>("login_result", OnLoginResult);
    client.Dispatcher.Register<RoomResultMessage>("room_result", OnRoomResult);
    client.Dispatcher.Register<RoomUpdateMessage>("room_update", OnRoomUpdate);
  }

  private void OnRegisterResult(RegisterResultMessage message)
  {
    if (!message.success) return;
    AccountUsername = message.username;
  }
  private void OnLoginResult(LoginResultMessage message)
  {
    if (!message.success) return;
    AccountUsername = message.username;
  }

  private void SetMyPlayer(SeatData seat)
  {
    MySeatData = seat;
  }

  public int GetMySeatIndex()
  {
    if (CurrentRoom == null) return -1;

    foreach (var seat in CurrentRoom.seats)
    {
      Debug.Log(seat.playerId);
      Debug.Log(MySeatData.playerId);

      if (seat.playerId == MySeatData.playerId)
        return seat.seatIndex;
    }

    return -1;
  }

  private void OnRoomResult(RoomResultMessage message)
  {
    if (!message.success) return;

    switch (message.action)
    {
      case "create":
      case "join":
      case "quick_join":
        SetMyPlayer(message.seat);
        break;

      case "leave":
        ClearRoom();
        GameSceneManager.LoadScene("Login");
        break;

    }
  }

  private void OnRoomUpdate(RoomUpdateMessage message)
  {
    Debug.Log(message.action);

    switch (message.action)
    {
      case "snapshot":
        CurrentRoom = message.room;
        break;
    }
  }

  public void ClearRoom()
  {
    MySeatData = null;
    CurrentRoom = null;
  }
}