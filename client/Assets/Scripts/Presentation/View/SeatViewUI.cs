using TMPro;
using System;
using UnityEngine;
using UnityEngine.UI;

public class SeatViewUI : MonoBehaviour
{
  [SerializeField] private TMP_Text _NameText;
  [SerializeField] private Button _SwipButton;
  [SerializeField] private Image _UserIcon;

  private int _seatIndex;
  public event Action<int> OnClickSeat;

  private void Start()
  {
    _SwipButton.onClick.AddListener(() => OnClickSeat?.Invoke(_seatIndex));
  }
  public void Setup(SeatData data)
  {
    _seatIndex = data.seatIndex;

    Debug.Log(data.role);

    if (data.IsEmpty)
    {
      _NameText.text = "Empty";
    }
    else
    {
      _NameText.text = data.IsDealer
        ? $"[Dealer] {data.username}"
        : data.username;
    }
  }
  public void Clear()
  {
    _NameText.text = "Empty";
  }
}