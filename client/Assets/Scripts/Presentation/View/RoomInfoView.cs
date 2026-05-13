using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class RoomInfoView : MonoBehaviour
{
  [Header("Chip")]
  [SerializeField] private TextMeshProUGUI _myChipLabel;
  [SerializeField] private TextMeshProUGUI _myBetLabel;

  [Header("Room")]
  [SerializeField] private TextMeshProUGUI _minChipLabel;
  [SerializeField] private GameObject _waitingForPlayers;

  [Header("Kicked Panel")]
  [SerializeField] private GameObject _kickedPanel;
  [SerializeField] private TextMeshProUGUI _kickedText;
  [SerializeField] private float _kickedDisplaySeconds = 3f;

  public event Action OnKickedDismissed;

  [Header("Host")]
  [SerializeField] private Button _btnStart;
  [SerializeField] private GameObject _hostCrown;

  private void Awake()
  {
    _btnStart.onClick.AddListener(OnClickStart);
    if (_waitingForPlayers) _waitingForPlayers.SetActive(false);
  }

  public void UpdateMyChip(int chip)
  {
    if (_myChipLabel) _myChipLabel.text = $"{chip:N0}";
  }

  public void UpdateBetAmount(int betAmount)
  {
    if (_myBetLabel) _myBetLabel.text = $"BET {betAmount:N0}";
  }

  public void UpdateMinChipLabel(int minChip)
  {
    if (_minChipLabel) _minChipLabel.text = minChip > 0 ? $"min {minChip:N0}" : "";
  }

  public void UpdateHostUI(bool isHost)
  {
    _btnStart.gameObject.SetActive(isHost);
    if (_hostCrown) _hostCrown.SetActive(isHost);
  }

  public void ResetStartButton() => _btnStart.interactable = true;

  public void ShowKickedPanel(string reason)
  {
    if (_kickedPanel) _kickedPanel.SetActive(true);
    if (_kickedText) _kickedText.text = reason;
    Invoke(nameof(HideKickedPanel), _kickedDisplaySeconds);
  }

  private void HideKickedPanel()
  {
    if (_kickedPanel) _kickedPanel.SetActive(false);
    OnKickedDismissed?.Invoke();
  }

  public void ShowWaitingForPlayers()
  {
    if (_waitingForPlayers) _waitingForPlayers.SetActive(true);
  }

  public void HideWaitingForPlayers()
  {
    if (_waitingForPlayers) _waitingForPlayers.SetActive(false);
  }

  private void OnClickStart()
  {
    _btnStart.interactable = false;
    NetworkHelper.RequestStartGame();
  }
}
