// =====================================================
// GameTableView.cs
// =====================================================
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class GameTableView : MonoBehaviour
{
  public event Action OnPlayAgainPressed;
  public event Action OnLeavePressed;

  [Header("Host")]
  [SerializeField] private Button _btnStart;
  [SerializeField] private GameObject _hostCrown; // icon มงกุฎ (optional)

  [Header("Result Popup Buttons")]
  [SerializeField] private Button _btnPlayAgain;
  [SerializeField] private Button _btnLeaveFromResult;

  [Header("Chip")]
  [SerializeField] private TextMeshProUGUI _myChipLabel;
  [SerializeField] private TextMeshProUGUI _myBetLabel;

  [Header("Room info")]
  [SerializeField] private TextMeshProUGUI _minChipLabel;
  [SerializeField] private GameObject _kickedPanel;
  [SerializeField] private TextMeshProUGUI _kickedText;

  [Header("My hand (bottom)")]
  [SerializeField] private HandView _myHand;
  [SerializeField] private TextMeshProUGUI _myScoreLabel;
  [SerializeField] private TextMeshProUGUI _myNameLabel;
  [SerializeField] private GameObject _myTurnIndicator;

  [Header("Dealer (top)")]
  [SerializeField] private HandView _dealerHand;
  [SerializeField] private TextMeshProUGUI _dealerScoreLabel;

  [Header("Other players (middle row)")]
  [SerializeField] private OtherPlayerView[] _otherSlots;

  [Header("Animator")]
  [SerializeField] private CardDealAnimator _animator;

  [Header("Buttons")]
  [SerializeField] private Button _btnHit;
  [SerializeField] private Button _btnStand;

  [Header("Waiting label")]
  [SerializeField] private GameObject _waitingForPlayers; // "รอผู้เล่นอื่น..."

  [Header("Result")]
  [SerializeField] private TextMeshProUGUI _myResultLabel;     // บน HandView ของตัวเอง
  [SerializeField] private TextMeshProUGUI _resultPopupLabel;  // popup กลางจอ

  [Header("Panels")]
  [SerializeField] private GameObject _lobbyPanel;      // มี btnStart, player list, minChip
  [SerializeField] private GameObject _gameplayPanel;   // มี hand, score, action buttons
  [SerializeField] private GameObject _resultPopupPanel; // popup หลังเกมจบ


  private readonly Dictionary<int, OtherPlayerView> _playerViews = new();
  private int _myPlayerId;

  private void Awake()
  {
    _btnStart.onClick.AddListener(OnClickStart);
    _btnHit.onClick.AddListener(() => NetworkHelper.RequestHit());
    _btnStand.onClick.AddListener(() => NetworkHelper.RequestStand());
    _btnPlayAgain.onClick.AddListener(OnClickPlayAgain);
    _btnLeaveFromResult.onClick.AddListener(OnClickLeaveFromResult);

    SetActionButtons(false);
    if (_waitingForPlayers) _waitingForPlayers.SetActive(false);
    foreach (var slot in _otherSlots) slot.gameObject.SetActive(false);

    ShowLobby();
  }

  // ─── Setup ──────────────────────────────────────────────────

  public void SetMyPlayerId(int id) => _myPlayerId = id;
  public void SetMyName(string name) => _myNameLabel.text = name;

  // ─── Deal initial (DEALING state) ───────────────────────────

  public void UpdateMyChip(int chip)
  {
    if (_myChipLabel)
      _myChipLabel.text = $"{chip:N0}";
  }

  public void UpdateBetAmount(int betAmount)
  {
    if (_myBetLabel)
      _myBetLabel.text = $"BET {betAmount:N0}";
  }

  public void DealInitialCards(
      PlayerState[] players,
      DealerState dealer,
      int myPlayerId,
      Action onComplete)
  {
    ClearAll();
    _playerViews.Clear();

    // ── assign OtherPlayerView slots ──
    int slotIdx = 0;
    foreach (var p in players)
    {
      if (p.playerId == myPlayerId) continue;
      if (slotIdx >= _otherSlots.Length) break;

      var slot = _otherSlots[slotIdx++];
      slot.gameObject.SetActive(true);
      slot.Init(p.playerId, $"P{p.playerId}");
      _playerViews[p.playerId] = slot;
    }

    var queue = new List<(CardView card, RectTransform slot)>();

    // dealer: ใบแรกเปิด ใบที่ 2 ปิด
    if (dealer?.hand != null && dealer.hand.Length >= 2)
    {
      var cv0 = _dealerHand.SpawnCard(
          CardIndex.ToIndex(dealer.hand[0].suit, dealer.hand[0].rank));
      var cv1 = _dealerHand.SpawnFaceDown(
          CardIndex.ToIndex(dealer.hand[1].suit, dealer.hand[1].rank));
      queue.Add((cv0, _dealerHand.LastSlot()));
      queue.Add((cv1, _dealerHand.LastSlot()));
      SetScore(_dealerScoreLabel, 0, hidden: true);
    }

    // players: เราเห็นไพ่ตัวเอง / คนอื่นปิดใบที่ 2
    foreach (var p in players)
    {
      if (p.hand == null || p.hand.Length < 2) continue;

      if (p.playerId == myPlayerId)
      {
        var cv0 = _myHand.SpawnCard(
            CardIndex.ToIndex(p.hand[0].suit, p.hand[0].rank));
        var cv1 = _myHand.SpawnCard(
            CardIndex.ToIndex(p.hand[1].suit, p.hand[1].rank));
        queue.Add((cv0, _myHand.LastSlot()));
        queue.Add((cv1, _myHand.LastSlot()));
        SetScore(_myScoreLabel, p.score);
      }
      else if (_playerViews.TryGetValue(p.playerId, out var view))
      {
        var (open, closed) = view.SpawnInitialCards(p.hand[0], p.hand[1]);
        queue.Add((open, view.LastSlot()));
        queue.Add((closed, view.LastSlot()));
      }
    }

    _animator.DealCards(queue.ToArray(), onComplete);
  }

  // ─── Chip ────────────────────────────────────────────────

  public void UpdateMinChipLabel(int minChip)
  {
    if (_minChipLabel)
      _minChipLabel.text = minChip > 0 ? $"min {minChip:N0}" : "";
  }

  public void ShowKickedMessage(string reason)
  {
    if (_kickedPanel) _kickedPanel.SetActive(true);
    if (_kickedText) _kickedText.text = reason;
    Invoke(nameof(HideKickedMessage), 3f);
  }

  private void HideKickedMessage()
  {
    if (_kickedPanel) _kickedPanel.SetActive(false);
  }

  // ─── UpdateHostUI ────────────────────────────────────────────────

  public void UpdateHostUI(bool isHost)
  {
    // host เท่านั้นเห็นปุ่ม Start
    _btnStart.gameObject.SetActive(isHost);

    if (_hostCrown) _hostCrown.SetActive(isHost);
    if (_btnPlayAgain) _btnPlayAgain.gameObject.SetActive(isHost);
    Debug.Log($"[TableView] isHost={isHost} → btnStart {(isHost ? "shown" : "hidden")}");
  }


  // ─── Hit card ────────────────────────────────────────────────

  public void AddCard(CardDataRes card, int newScore, int playerId)
  {
    if (playerId == _myPlayerId)
    {
      var cv = _myHand.SpawnCard(CardIndex.ToIndex(card.suit, card.rank));
      var slot = _myHand.LastSlot();
      _animator.DealCards(new[] { (cv, slot) }, () =>
          SetScore(_myScoreLabel, newScore));
    }
    else if (_playerViews.TryGetValue(playerId, out var view))
    {
      var cv = view.SpawnHitCard(card);
      var slot = view.LastSlot();
      _animator.DealCards(new[] { (cv, slot) }, () =>
          view.UpdateScore(newScore));
    }
  }

  // ─── Turn highlight ──────────────────────────────────────────

  public void SetTurn(int currentPlayerId)
  {
    bool myTurn = currentPlayerId == _myPlayerId;
    if (_myTurnIndicator) _myTurnIndicator.SetActive(myTurn);

    foreach (var (pid, view) in _playerViews)
      view.SetTurnHighlight(pid == currentPlayerId);
  }

  // ─── Waiting for players ─────────────────────────────────────

  public void ShowWaitingForPlayers()
  {
    if (_waitingForPlayers) _waitingForPlayers.SetActive(true);
  }

  public void HideWaitingForPlayers()
  {
    if (_waitingForPlayers) _waitingForPlayers.SetActive(false);
  }

  // ─── Reveal all (game end) ───────────────────────────────────

  public void RevealAll(PlayerState[] players, DealerState dealer)
  {
    _dealerHand.RevealAll();
    if (dealer != null) SetScore(_dealerScoreLabel, dealer.score);

    if (players == null) return;
    foreach (var p in players)
    {
      if (p.playerId == _myPlayerId) continue;
      if (_playerViews.TryGetValue(p.playerId, out var view))
        view.RevealAll(p.score);
    }
  }

  // ─── Action buttons ──────────────────────────────────────────

  public void ShowActionButtons()
  {
    SetActionButtons(true);
    if (_myTurnIndicator) _myTurnIndicator.SetActive(true);
  }

  public void HideActionButtons()
  {
    SetActionButtons(false);
    if (_myTurnIndicator) _myTurnIndicator.SetActive(false);
  }

  public void ShowResult(int playerId, string result)
  {
    // ── บน HandView ──
    if (playerId == _myPlayerId)
    {
      if (_myResultLabel)
      {
        _myResultLabel.text = result;
        _myResultLabel.color = ResultColor(result);
        _myResultLabel.gameObject.SetActive(true);
      }

      // ── popup กลางจอ ──
      if (_resultPopupPanel) _resultPopupPanel.SetActive(true);
      if (_resultPopupLabel)
      {
        _resultPopupLabel.text = result;
        _resultPopupLabel.color = ResultColor(result);
      }
    }
    else if (_playerViews.TryGetValue(playerId, out var view))
    {
      view.ShowResult(result);
    }
  }

  public void HideResult()
  {
    if (_myResultLabel) _myResultLabel.gameObject.SetActive(false);
    if (_resultPopupPanel) _resultPopupPanel.SetActive(false);
  }

  private Color ResultColor(string result) => result switch
  {
    "WIN" => new Color(0.2f, 0.85f, 0.2f),   // เขียว
    "LOSE" => new Color(0.9f, 0.2f, 0.2f),    // แดง
    "DRAW" => new Color(0.9f, 0.75f, 0.1f),   // เหลือง
    _ => Color.white,
  };

  public void ShowLobby()
  {
    _lobbyPanel.SetActive(true);
    _gameplayPanel.SetActive(false);
    _resultPopupPanel.SetActive(false);
  }

  public void ShowGameplay()
  {
    _lobbyPanel.SetActive(false);
    _gameplayPanel.SetActive(true);
    _resultPopupPanel.SetActive(false);
  }

  // ─── Reset ───────────────────────────────────────────────────

  public void ResetTable()
  {
    _animator.StopAll();
    ClearAll();
    HideResult();
    _resultPopupPanel.SetActive(false);
    SetScore(_myScoreLabel, 0);
    SetScore(_dealerScoreLabel, 0, hidden: true);
    HideActionButtons();
    HideWaitingForPlayers();
    _btnStart.interactable = true;
    foreach (var slot in _otherSlots) slot.gameObject.SetActive(false);
    _playerViews.Clear();
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private void OnClickStart()
  {
    _btnStart.interactable = false;
    NetworkHelper.RequestStartGame();
  }

  private void OnClickPlayAgain()
  {
    OnPlayAgainPressed?.Invoke();
  }

  private void OnClickLeaveFromResult()
  {
    NetworkHelper.RequestLeaveRoom();
    OnLeavePressed?.Invoke();
  }

  private void SetActionButtons(bool show)
  {
    _btnHit.gameObject.SetActive(show);
    _btnStand.gameObject.SetActive(show);
  }

  private void SetScore(TextMeshProUGUI label, int score, bool hidden = false)
      => label.text = hidden ? "?" : score > 0 ? score.ToString() : "";

  private void ClearAll()
  {
    _myHand.Clear();
    _dealerHand.Clear();
    foreach (var (_, view) in _playerViews) view.Clear();
  }
}