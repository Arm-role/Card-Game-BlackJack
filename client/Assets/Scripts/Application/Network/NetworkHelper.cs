public class NetworkHelper : INetworkSender
{
  private readonly IWSClient _client;

  public NetworkHelper(IWSClient client)
  {
    _client = client;
  }

  public void RequestLogin(string username, string password)
  {
    _client.Send(new LoginRequest
    {
      type = "request_login",
      data = new AuthData { username = username, password = password }
    });
  }

  public void RequestRegister(string username, string password)
  {
    _client.Send(new RegisterRequest
    {
      type = "request_register",
      data = new AuthData { username = username, password = password }
    });
  }

  public void RequestCreateRoom(int minChip = GameConfig.MinChip, int betAmount = GameConfig.BetAmount)
  {
    _client.Send(new CreateRoomRequest
    {
      type = "request_create_room",
      data = new CreatRoomDataRequest { minChip = minChip, betAmount = betAmount }
    });
  }

  public void RequestJoinRoom(int roomId)
  {
    _client.Send(new JoinRoomRequest
    {
      type = "request_join_room",
      data = new RoomDataRequest { roomId = roomId.ToString() }
    });
  }

  public void RequestQuickJoinRoom()
  {
    _client.Send(new QuickJoinRequest { type = "request_quick_join_room" });
  }

  public void RequestLeaveRoom()
  {
    _client.Send(new LeaveRoomRequest());
  }

  public void RequestSwapSeat(int fromSeat, int toSeat)
  {
    _client.Send(new SwapSeatRequest
    {
      type = "request_swap_seat",
      data = new SwapSeatData { fromSeat = fromSeat, toSeat = toSeat }
    });
  }

  public void RequestSwapResponse(bool accept)
  {
    _client.Send(new SwapResponseRequest
    {
      type = "request_swap_response",
      data = new SwapSeatResponsData { accept = accept }
    });
  }

  public void RequestStartGame()
  {
    _client.Send(new StartGameRequest());
  }

  public void RequestPlayerReady()
  {
    _client.Send(new PlayerReadyRequest());
  }

  public void RequestHit()
  {
    _client.Send(new HitRequest());
  }

  public void RequestStand()
  {
    _client.Send(new StandRequest());
  }

  public void RequestClaimChip()
  {
    _client.Send(new ClaimChipRequest());
  }
}
