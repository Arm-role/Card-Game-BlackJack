using UnityEngine;

public class GameState : MonoBehaviour
{
  public static GameState Instance { get; private set; }

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

  public void Initialze(IWSClient client)
  {
    client.Dispatcher.Register<RoomUpdateMessage>("room_update", OnRoomUpdate);
    client.Dispatcher.Register<RoomResultMessage>("room_result", OnRoomResult);
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
        CurrentRoom = message.payload;
        break;

        //case "player_joined":
        //  PlayerJoinRoom(message.player);
        //  break;
    }
  }

  public void ClearRoom()
  {
    MySeatData = null;
    CurrentRoom = null;
  }
}