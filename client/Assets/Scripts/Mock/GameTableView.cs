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
  [SerializeField] private Button _btnStart;
  [SerializeField] private Button _btnHit;
  [SerializeField] private Button _btnStand;

  [Header("Waiting label")]
  [SerializeField] private GameObject _waitingForPlayers; // "รอผู้เล่นอื่น..."

  private readonly Dictionary<int, OtherPlayerView> _playerViews = new();
  private int _myPlayerId;

  private void Awake()
  {
    _btnStart.onClick.AddListener(OnClickStart);
    _btnHit.onClick.AddListener(() => NetworkHelper.RequestHit());
    _btnStand.onClick.AddListener(() => NetworkHelper.RequestStand());

    SetActionButtons(false);
    if (_waitingForPlayers) _waitingForPlayers.SetActive(false);
    foreach (var slot in _otherSlots) slot.gameObject.SetActive(false);
  }

  // ─── Setup ──────────────────────────────────────────────────

  public void SetMyPlayerId(int id) => _myPlayerId = id;
  public void SetMyName(string name) => _myNameLabel.text = name;

  // ─── Deal initial (DEALING state) ───────────────────────────

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

  // ─── Reset ───────────────────────────────────────────────────

  public void ResetTable()
  {
    ClearAll();
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