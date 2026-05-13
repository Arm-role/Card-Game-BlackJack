// =====================================================
// CardView.cs
// =====================================================
using UnityEngine;
using UnityEngine.UI;

public class CardView : MonoBehaviour
{
  [SerializeField] private Image _image;

  private const int CARD_BACK_INDEX = 52; // sprite หลังไพ่

  public void SetCard(int cardIndex)
  {
    var sprite = Resources.Load<Sprite>($"Card/{cardIndex}");
    if (sprite != null) _image.sprite = sprite;
    else Debug.LogWarning($"[CardView] not found: Card/{cardIndex}");
  }

  public void SetFaceDown() => SetCard(CARD_BACK_INDEX);

  public void Reveal(int cardIndex) => SetCard(cardIndex);
}