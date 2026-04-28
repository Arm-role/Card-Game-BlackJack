// =====================================================
// HandView.cs
// =====================================================
using System.Collections.Generic;
using UnityEngine;

public class HandView : MonoBehaviour
{
  [SerializeField] private GameObject _cardPrefab;
  [SerializeField] private RectTransform _container;

  private readonly List<(CardView view, int realIndex)> _cards = new();

  // spawn ไพ่หน้าขึ้น
  public CardView SpawnCard(int cardIndex)
  {
    var go = Instantiate(_cardPrefab, _container);
    var view = go.GetComponent<CardView>();
    view.SetCard(cardIndex);
    go.SetActive(false);
    _cards.Add((view, cardIndex));
    return view;
  }

  // spawn ไพ่หน้าคว่ำ (เก็บ realIndex ไว้ reveal ทีหลัง)
  public CardView SpawnFaceDown(int realCardIndex)
  {
    var go = Instantiate(_cardPrefab, _container);
    var view = go.GetComponent<CardView>();
    view.SetFaceDown();
    go.SetActive(false);
    _cards.Add((view, realCardIndex));
    return view;
  }

  // เปิดไพ่ทุกใบที่ปิดอยู่
  public void RevealAll()
  {
    for (int i = 0; i < _cards.Count; i++)
      _cards[i].view.Reveal(_cards[i].realIndex);
  }

  public RectTransform LastSlot() =>
      _cards[^1].view.GetComponent<RectTransform>();

  public void Clear()
  {
    foreach (var (view, _) in _cards) Destroy(view.gameObject);
    _cards.Clear();
  }
}
