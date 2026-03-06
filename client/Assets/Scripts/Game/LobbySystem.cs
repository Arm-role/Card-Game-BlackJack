public class LobbySystem
{
  private GameState _gameState;
  private WSClient _client;

  public LobbySystem(GameState gameState, WSClient client)
  {
    _gameState = gameState;
    _client = client;

    client.Dispatcher.Register<RoomUpdateMessage>("room_update", OnRoomUpdate);
    client.Dispatcher.Register<RoomResultMessage>("room_result", OnRoomResult);

    RequestRoomSnapshot();
  }

  private void OnRoomUpdate(RoomUpdateMessage message)
  {
    _gameState.SetRoomData(message.payload);
  }

  private void OnRoomResult(RoomResultMessage message)
  {
    if (message.action == "leave" && message.success)
    {
      _gameState.ClearRoom();
      GameSceneManager.LoadScene("Login");
    }
  }

  // ==== Called by UI ====
  private void RequestRoomSnapshot()
  {
    NetworkHelper.RequestRoomSnapshot();
  }

  public void LeaveRoom()
  {
    NetworkHelper.RequestLeaveRoom();
  }
}