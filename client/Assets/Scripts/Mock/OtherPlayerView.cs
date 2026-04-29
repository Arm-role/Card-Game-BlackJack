// =====================================================
// OtherPlayerView.cs
// =====================================================
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class OtherPlayerView : MonoBehaviour
{
  [SerializeField] private TextMeshProUGUI _nameLabel;
  [SerializeField] private TextMeshProUGUI _scoreLabel;
  [SerializeField] private GameObject _turnIndicator; // "waiting" badge
  [SerializeField] private HandView _hand;
  [SerializeField] private Image _border;        // highlight เมื่อเป็น turn
  [SerializeField] private TextMeshProUGUI _resultLabel;

  private int _playerId;

  public int PlayerId => _playerId;

  public void Init(int playerId, string username)
  {
    _playerId = playerId;
    _nameLabel.text = username;
    _scoreLabel.text = "?";
    SetTurnHighlight(false);
  }

  // แจกไพ่เริ่มต้น: ใบแรกเปิด ใบที่ 2 ปิด
  public (CardView open, CardView closed) SpawnInitialCards(
      CardDataRes card0, CardDataRes card1)
  {
    int idx0 = CardIndex.ToIndex(card0.suit, card0.rank);
    int idx1 = CardIndex.ToIndex(card1.suit, card1.rank);
    var open = _hand.SpawnCard(idx0);
    var closed = _hand.SpawnFaceDown(idx1);
    return (open, closed);
  }

  // hit card เพิ่ม (หน้าขึ้น)
  public CardView SpawnHitCard(CardDataRes card)
  {
    int idx = CardIndex.ToIndex(card.suit, card.rank);
    return _hand.SpawnCard(idx);
  }

  // เปิดไพ่ทั้งหมดเมื่อเกมจบ
  public void RevealAll(int finalScore)
  {
    _hand.RevealAll();
    _scoreLabel.text = finalScore.ToString();
  }

  public void SetTurnHighlight(bool active)
  {
    if (_turnIndicator) _turnIndicator.SetActive(active);
    // เปลี่ยนสี border ถ้ามี Image component
    if (_border) _border.color = active
        ? new Color(0.22f, 0.54f, 0.85f, 1f) // blue
        : new Color(0.8f, 0.8f, 0.8f, 0.3f);
  }

  public void UpdateScore(int score) =>
      _scoreLabel.text = score.ToString();
  public void ShowResult(string result)
  {
    if (!_resultLabel) return;
    _resultLabel.text = result;
    _resultLabel.color = result switch
    {
      "WIN" => new Color(0.2f, 0.85f, 0.2f),
      "LOSE" => new Color(0.9f, 0.2f, 0.2f),
      "DRAW" => new Color(0.9f, 0.75f, 0.1f),
      _ => Color.white,
    };
    _resultLabel.gameObject.SetActive(true);
  }

  // เพิ่มใน Clear()
  public void Clear()
  {
    _hand.Clear();
    if (_resultLabel) _resultLabel.gameObject.SetActive(false);  // ← เพิ่ม
  }

  public RectTransform LastSlot() => _hand.LastSlot();
}