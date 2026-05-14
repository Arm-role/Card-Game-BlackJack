using UnityEngine;

public class GameState : MonoBehaviour
{
  public static GameState Instance { get; private set; }
  public string? AccountUsername { get; private set; }
  public SeatData MySeatData { get; private set; }
  public RoomData CurrentRoom { get; private set; }

  public bool IsInitialze = false;

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

  public void Initialze(IMessageRouter router, IGameInput gameInput)
  {
    router.OnRegisterResult += OnRegisterResult;
    router.OnLoginResult += OnLoginResult;
    router.OnRoomResult += OnRoomResult;
    router.OnRoomUpdate += OnRoomUpdate;

    IsInitialze = true;
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
    if (CurrentRoom != null)
      GameSceneManager.LoadScene("Lobby");
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
    if (!message.success)
    {
      if (message.action == "kicked") ClearRoom();
      return;
    }

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

  // Canonical owner for room_closed navigation — do NOT call LoadScene("Login") elsewhere for this event
  private void OnRoomUpdate(RoomUpdateMessage message)
  {
    Debug.LogWarning(message.action);

    switch (message.action)
    {
      case "snapshot":
        CurrentRoom = message.room;
        break;

      case "room_closed":
        ClearRoom();
        GameSceneManager.LoadScene("Login");
        break;
    }
  }

  public void Logout()
  {
    AccountUsername = null;
    ClearRoom();
  }

  public void ClearRoom()
  {
    MySeatData = null;
    CurrentRoom = null;
  }
}