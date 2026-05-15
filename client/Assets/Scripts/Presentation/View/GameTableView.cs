using System;
using UnityEngine;

public class GameTableView : MonoBehaviour, IGameTableView, ICoroutineRunner
{
  [Header("Sub-views")]
  [SerializeField] private CardDealView _cardDeal;
  [SerializeField] private ActionButtonsView _actionButtons;
  [SerializeField] private RoomInfoView _roomInfo;
  [SerializeField] private ResultView _result;

  [Header("Panels")]
  [SerializeField] private GameObject _lobbyPanel;
  [SerializeField] private GameObject _gameplayPanel;

  public event Action OnPlayAgainPressed;
  public event Action OnLeavePressed;
  public event Action OnKickedDismissed;

  public bool IsAnimating => _cardDeal.IsAnimating;
  public bool IsGameplayWired { get; private set; }
  private GameplayLogic _gameplay;

  private void Awake()
  {
    _result.OnPlayAgainPressed += () => OnPlayAgainPressed?.Invoke();
    _result.OnLeavePressed += () => OnLeavePressed?.Invoke();
    _roomInfo.OnKickedDismissed += () => OnKickedDismissed?.Invoke();
    ShowLobby();
  }

  // ─── Setup ────────────────────────────────────────────

  public void SetupNetworking(INetworkSender sender)
  {
    _actionButtons.Init(sender);
    _roomInfo.Init(sender);
  }

  public void MarkGameplayWired(GameplayLogic gameplay = null)
  {
    IsGameplayWired = true;
    _gameplay = gameplay;
  }

  private void OnDestroy() => _gameplay?.Dispose();

  public void SetMyPlayerId(int id) => _cardDeal.SetMyPlayerId(id);
  public void SetMyName(string name) => _cardDeal.SetMyName(name);

  // ─── Panels ───────────────────────────────────────────

  public void ShowLobby()
  {
    _lobbyPanel.SetActive(true);
    _gameplayPanel.SetActive(false);
    _result.HideResult();
  }

  public void ShowGameplay()
  {
    _lobbyPanel.SetActive(false);
    _gameplayPanel.SetActive(true);
    _result.HideResult();
  }

  // ─── Cards ────────────────────────────────────────────

  public void DealInitialCards(PlayerState[] players, DealerState dealer, int myPlayerId, Action onComplete)
      => _cardDeal.DealInitialCards(players, dealer, myPlayerId, onComplete);

  public void AddCard(CardDataRes card, int newScore, int playerId)
      => _cardDeal.AddCard(card, newScore, playerId);

  public void RevealDealerAndShowResult(DealerState dealer, PlayerState[] players,
      PlayerRoundResult[] results, int myPlayerId, Action<PlayerRoundResult[]> onDone)
      => _cardDeal.RevealDealerAndShowResult(dealer, players, results, myPlayerId, onDone);

  public void RevealAll(PlayerState[] players, DealerState dealer)
      => _cardDeal.RevealAll(players, dealer);

  public void RevealAllWhenReady(Action reveal)
  {
    if (_cardDeal.IsAnimating)
      _cardDeal.QueueAction(reveal);
    else
      reveal();
  }

  // ─── Turn ─────────────────────────────────────────────

  public void SetTurn(int currentPlayerId) => _cardDeal.SetTurn(currentPlayerId);

  // ─── Action buttons ───────────────────────────────────

  public void ShowActionButtons() => _actionButtons.ShowActionButtons();
  public void HideActionButtons() => _actionButtons.HideActionButtons();

  // ─── Result ───────────────────────────────────────────

  public void ShowResult(int playerId, GameResult result)
  {
    if (playerId == _cardDeal.MyPlayerId)
      _result.ShowMyResult(result);
    else
      _cardDeal.ShowOtherPlayerResult(playerId, result);
  }

  public void HideResult() => _result.HideResult();
  public void HideResultButtons() => _result.HideAllButtons();

  // ─── Room info ────────────────────────────────────────

  public void UpdateMyChip(int chip) => _roomInfo.UpdateMyChip(chip);
  public void UpdateBetAmount(int bet) => _roomInfo.UpdateBetAmount(bet);
  public void UpdateMinChipLabel(int min) => _roomInfo.UpdateMinChipLabel(min);
  public void UpdateHostUI(bool isHost)
  {
    _roomInfo.UpdateHostUI(isHost);
    _result.SetPlayAgainVisible(isHost);
  }
  public void ShowKickedPanel(string reason) => _roomInfo.ShowKickedPanel(reason);
  public void ShowWaitingForPlayers() => _roomInfo.ShowWaitingForPlayers();
  public void HideWaitingForPlayers() => _roomInfo.HideWaitingForPlayers();

  // ─── Reset ────────────────────────────────────────────

  public void ResetTable()
  {
    _cardDeal.Reset();
    _actionButtons.HideActionButtons();
    _result.HideResult();
    _roomInfo.HideWaitingForPlayers();
    _roomInfo.ResetStartButton();
  }

  public void ResetWhenReady(Action onDone = null)
  {
    if (_cardDeal.IsAnimating)
      _cardDeal.QueueAction(() => { ResetTable(); onDone?.Invoke(); });
    else
    {
      ResetTable();
      onDone?.Invoke();
    }
  }
}
