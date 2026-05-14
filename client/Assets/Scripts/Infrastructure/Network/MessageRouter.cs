using System;

public class MessageRouter : IMessageRouter
{
    public event Action OnWSConnected;
    public event Action<RegisterResultMessage> OnRegisterResult;
    public event Action<LoginResultMessage> OnLoginResult;
    public event Action<RoomResultMessage> OnRoomResult;
    public event Action<RoomUpdateMessage> OnRoomUpdate;
    public event Action<GameUpdateMessage> OnGameUpdate;
    public event Action<GameEventMessage> OnGameEvent;
    public event Action<GameResultMessage> OnGameResult;
    public event Action<ErrorMessage> OnError;
    public event Action<ClaimChipResultMessage> OnClaimChipResult;

    public MessageRouter(INetworkDispatcher dispatcher)
    {
        dispatcher.OnWSConnected += () => OnWSConnected?.Invoke();
        dispatcher.Register<RegisterResultMessage>("register_result", m => OnRegisterResult?.Invoke(m));
        dispatcher.Register<LoginResultMessage>("login_result", m => OnLoginResult?.Invoke(m));
        dispatcher.Register<RoomResultMessage>("room_result", m => OnRoomResult?.Invoke(m));
        dispatcher.Register<RoomUpdateMessage>("room_update", m => OnRoomUpdate?.Invoke(m));
        dispatcher.Register<GameUpdateMessage>("game_update", m => OnGameUpdate?.Invoke(m));
        dispatcher.Register<GameEventMessage>("game_event", m => OnGameEvent?.Invoke(m));
        dispatcher.Register<GameResultMessage>("game_result", m => OnGameResult?.Invoke(m));
        dispatcher.Register<ErrorMessage>("error", m => OnError?.Invoke(m));
        dispatcher.Register<ClaimChipResultMessage>("claim_chip_result", m => OnClaimChipResult?.Invoke(m));
    }
}
