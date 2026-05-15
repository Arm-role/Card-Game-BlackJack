using System;

public interface IMessageRouter
{
  event Action OnWSConnected;
  event Action<RegisterResultMessage> OnRegisterResult;
  event Action<LoginResultMessage> OnLoginResult;
  event Action<RoomResultMessage> OnRoomResult;
  event Action<RoomUpdateMessage> OnRoomUpdate;
  event Action<GameUpdateMessage> OnGameUpdate;
  event Action<GameEventMessage> OnGameEvent;
  event Action<GameResultMessage> OnGameResult;
  event Action<ErrorMessage> OnError;
  event Action<ClaimChipResultMessage> OnClaimChipResult;
}
