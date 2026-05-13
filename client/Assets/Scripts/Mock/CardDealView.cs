using System;
using System.Collections.Generic;
using UnityEngine;
using TMPro;

public class CardDealView : MonoBehaviour
{
  [Header("My hand")]
  [SerializeField] private HandView _myHand;
  [SerializeField] private TextMeshProUGUI _myScoreLabel;
  [SerializeField] private TextMeshProUGUI _myNameLabel;
  [SerializeField] private GameObject _myTurnIndicator;

  [Header("Dealer")]
  [SerializeField] private HandView _dealerHand;
  [SerializeField] private TextMeshProUGUI _dealerScoreLabel;

  [Header("Other players")]
  [SerializeField] private OtherPlayerView[] _otherSlots;

  [Header("Animator")]
  [SerializeField] private CardDealAnimator _animator;

  private readonly Dictionary<int, OtherPlayerView> _playerViews = new();
  private int _myPlayerId;
  private bool _isAnimating;
  private Action _pendingStateChange;

  public int MyPlayerId => _myPlayerId;
  public bool IsAnimating => _isAnimating;

  public void SetMyPlayerId(int id) { _myPlayerId = id; }
  public void SetMyName(string name) => _myNameLabel.text = name;

  public void QueueAction(Action action) => _pendingStateChange = action;

  // ─── Deal ─────────────────────────────────────────────

  public void DealInitialCards(PlayerState[] players, DealerState dealer, int myPlayerId, Action onComplete)
  {
    _myPlayerId = myPlayerId;
    Reset();
    _playerViews.Clear();

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

    var queue = new System.Collections.Generic.List<(CardView, RectTransform)>();

    if (dealer?.hand != null && dealer.hand.Length >= 2)
    {
      var cv0 = _dealerHand.SpawnCard(CardIndex.ToIndex(dealer.hand[0].suit, dealer.hand[0].rank));
      var cv1 = _dealerHand.SpawnFaceDown(CardIndex.ToIndex(dealer.hand[1].suit, dealer.hand[1].rank));
      queue.Add((cv0, _dealerHand.LastSlot()));
      queue.Add((cv1, _dealerHand.LastSlot()));
      SetScore(_dealerScoreLabel, 0, hidden: true);
    }

    foreach (var p in players)
    {
      if (p.hand == null || p.hand.Length < 2) continue;
      if (p.playerId == myPlayerId)
      {
        var cv0 = _myHand.SpawnCard(CardIndex.ToIndex(p.hand[0].suit, p.hand[0].rank));
        var cv1 = _myHand.SpawnCard(CardIndex.ToIndex(p.hand[1].suit, p.hand[1].rank));
        queue.Add((cv0, _myHand.LastSlot()));
        queue.Add((cv1, _myHand.LastSlot()));
        SetScore(_myScoreLabel, p.score);
      }
      else if (_playerViews.TryGetValue(p.playerId, out var view))
      {
        var (first, second) = view.SpawnInitialCards(p.hand[0], p.hand[1]);
        queue.Add((first, view.LastSlot()));
        queue.Add((second, view.LastSlot()));
      }
    }

    _isAnimating = true;
    _animator.DealCards(queue.ToArray(), () =>
    {
      _isAnimating = false;
      _pendingStateChange?.Invoke();
      _pendingStateChange = null;
      onComplete?.Invoke();
    });
  }

  public void AddCard(CardDataRes card, int newScore, int playerId)
  {
    if (playerId == _myPlayerId)
    {
      var cv = _myHand.SpawnCard(CardIndex.ToIndex(card.suit, card.rank));
      _isAnimating = true;
      _animator.DealCards(new[] { (cv, _myHand.LastSlot()) }, () =>
      {
        SetScore(_myScoreLabel, newScore);
        _isAnimating = false;
        _pendingStateChange?.Invoke();
        _pendingStateChange = null;
      });
    }
    else if (_playerViews.TryGetValue(playerId, out var view))
    {
      var cv = view.SpawnFaceDownHitCard(card);
      _isAnimating = true;
      _animator.DealCards(new[] { (cv, view.LastSlot()) }, () =>
      {
        _isAnimating = false;
        _pendingStateChange?.Invoke();
        _pendingStateChange = null;
      });
    }
  }

  // ─── Reveal ───────────────────────────────────────────

  public void RevealDealerAndShowResult(DealerState dealer, PlayerState[] players,
      PlayerRoundResult[] results, int myPlayerId, Action<PlayerRoundResult[]> onDone)
  {
    var queue = new System.Collections.Generic.List<(CardView, RectTransform)>();
    _dealerHand.RevealAll();

    if (dealer?.hand != null && dealer.hand.Length > 2)
    {
      for (int i = 2; i < dealer.hand.Length; i++)
      {
        var cv = _dealerHand.SpawnCard(CardIndex.ToIndex(dealer.hand[i].suit, dealer.hand[i].rank));
        queue.Add((cv, _dealerHand.LastSlot()));
      }
    }

    void finish()
    {
      SetScore(_dealerScoreLabel, dealer?.score ?? 0);
      if (players != null)
        foreach (var p in players)
          if (p.playerId != myPlayerId)
            if (_playerViews.TryGetValue(p.playerId, out var view))
              view.RevealAll(p.score);
      onDone?.Invoke(results);
    }

    if (queue.Count > 0)
    {
      _isAnimating = true;
      _animator.DealCards(queue.ToArray(), () =>
      {
        _isAnimating = false;
        _pendingStateChange?.Invoke();
        _pendingStateChange = null;
        finish();
      });
    }
    else finish();
  }

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

  // ─── Turn ─────────────────────────────────────────────

  public void SetTurn(int currentPlayerId)
  {
    bool myTurn = currentPlayerId == _myPlayerId;
    if (_myTurnIndicator) _myTurnIndicator.SetActive(myTurn);
    foreach (var (pid, view) in _playerViews)
      view.SetTurnHighlight(pid == currentPlayerId);
  }

  public void ShowOtherPlayerResult(int playerId, string result)
  {
    if (_playerViews.TryGetValue(playerId, out var view))
      view.ShowResult(result);
  }

  // ─── Reset ────────────────────────────────────────────

  public void Reset()
  {
    _animator.StopAll();
    _myHand.Clear();
    _dealerHand.Clear();
    foreach (var (_, view) in _playerViews) view.Clear();
    _playerViews.Clear();
    foreach (var slot in _otherSlots) slot.gameObject.SetActive(false);
    SetScore(_myScoreLabel, 0);
    SetScore(_dealerScoreLabel, 0, hidden: true);
    if (_myTurnIndicator) _myTurnIndicator.SetActive(false);
    _isAnimating = false;
    _pendingStateChange = null;
  }

  // ─── Private ──────────────────────────────────────────

  private void SetScore(TextMeshProUGUI label, int score, bool hidden = false)
      => label.text = hidden ? "?" : score > 0 ? score.ToString() : "";
}
