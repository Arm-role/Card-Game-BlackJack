using System;
using System.Collections;
using UnityEngine;

public class CardDealAnimator : MonoBehaviour
{
  [SerializeField] private RectTransform _deckPosition;
  [SerializeField] private float _dealDuration = 0.25f;
  [SerializeField] private float _delayBetweenCards = 0.1f;

  public void DealCards(
      (CardView card, RectTransform slot)[] cards,
      Action onAllDealt)
  {
    StartCoroutine(DealAllRoutine(cards, onAllDealt));
  }

  // ← เพิ่ม: ให้ ResetTable เรียกเพื่อหยุด coroutine ทั้งหมด
  public void StopAll()
  {
    StopAllCoroutines();
  }

  private IEnumerator DealAllRoutine(
      (CardView card, RectTransform slot)[] cards,
      Action onAllDealt)
  {
    foreach (var (card, slot) in cards)
    {
      bool done = false;
      StartCoroutine(FlyCard(card, slot, () => done = true));
      yield return new WaitUntil(() => done);
      yield return new WaitForSeconds(_delayBetweenCards);
    }
    onAllDealt?.Invoke();
  }

  private IEnumerator FlyCard(CardView card, RectTransform slot, Action onDone)
  {
    if (card == null || slot == null) { onDone?.Invoke(); yield break; }

    var rt = card.GetComponent<RectTransform>();
    rt.position = _deckPosition.position;
    card.gameObject.SetActive(true);

    yield return null;

    // เช็ค null หลัง yield เผื่อถูก Destroy ระหว่างรอ
    if (card == null || slot == null) { onDone?.Invoke(); yield break; }

    float elapsed = 0f;
    Vector3 start = _deckPosition.position;
    Vector3 end = slot.position;

    while (elapsed < _dealDuration)
    {
      // เช็คทุก frame
      if (card == null || slot == null) { onDone?.Invoke(); yield break; }

      elapsed += Time.deltaTime;
      float t = Mathf.SmoothStep(0f, 1f, elapsed / _dealDuration);
      rt.position = Vector3.Lerp(start, end, t);
      yield return null;
    }

    if (card == null || slot == null) { onDone?.Invoke(); yield break; }

    rt.position = end;
    onDone?.Invoke();
  }
}