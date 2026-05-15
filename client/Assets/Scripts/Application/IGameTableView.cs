using System;

public interface IGameTableView
{
  bool IsAnimating { get; }

  // Setup
  void SetMyPlayerId(int id);
  void SetMyName(string name);

  // Panels
  void ShowLobby();
  void ShowGameplay();

  // Cards
  void DealInitialCards(PlayerState[] players, DealerState dealer, int myPlayerId, Action onComplete);
  void AddCard(CardDataRes card, int newScore, int playerId);
  void RevealDealerAndShowResult(DealerState dealer, PlayerState[] players,
      PlayerRoundResult[] results, int myPlayerId, Action<PlayerRoundResult[]> onDone);
  void RevealAllWhenReady(Action reveal);

  // Turn
  void SetTurn(int currentPlayerId);

  // Action buttons
  void ShowActionButtons();
  void HideActionButtons();

  // Result
  void ShowResult(int playerId, GameResult result);
  void HideResult();
  void HideResultButtons();

  // Room info
  void UpdateMyChip(int chip);
  void UpdateBetAmount(int bet);
  void UpdateMinChipLabel(int min);
  void UpdateHostUI(bool isHost);
  void ShowKickedPanel(string reason);
  void ShowWaitingForPlayers();
  void HideWaitingForPlayers();

  // Reset
  void ResetWhenReady(Action onDone);

  // Events
  event Action OnPlayAgainPressed;
  event Action OnLeavePressed;
  event Action OnKickedDismissed;
}
