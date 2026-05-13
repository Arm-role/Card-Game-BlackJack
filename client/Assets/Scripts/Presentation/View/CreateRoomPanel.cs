using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class CreateRoomPanel : MonoBehaviour
{
  [Header("Buttons")]
  [SerializeField] private Button _submitButton;
  [SerializeField] private Button _backButton;
  [SerializeField] private Button _bet100;
  [SerializeField] private Button _bet1k;
  [SerializeField] private Button _bet10k;
  [SerializeField] private Button _bet100k;

  [Header("Display")]
  [SerializeField] private TextMeshProUGUI _betAmountText;

  public event Action<int> OnConfirmed;

  private int _betAmount = GameConfig.BetAmount;

  private void Awake()
  {
    _submitButton.onClick.AddListener(OnSubmit);
    _backButton.onClick.AddListener(Hide);
    _bet100.onClick.AddListener(() => SetBet(100));
    _bet1k.onClick.AddListener(() => SetBet(1_000));
    _bet10k.onClick.AddListener(() => SetBet(10_000));
    _bet100k.onClick.AddListener(() => SetBet(100_000));
    gameObject.SetActive(false);
  }

  public void Show()
  {
    SetBet(GameConfig.BetAmount);
    gameObject.SetActive(true);
  }

  private void Hide() => gameObject.SetActive(false);

  private void SetBet(int amount)
  {
    _betAmount = amount;
    if (_betAmountText) _betAmountText.text = $"{amount:N0}";
  }

  private void OnSubmit()
  {
    Hide();
    OnConfirmed?.Invoke(_betAmount);
  }
}
