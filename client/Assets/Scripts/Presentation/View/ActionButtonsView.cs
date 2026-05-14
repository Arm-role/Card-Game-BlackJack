using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class ActionButtonsView : MonoBehaviour
{
  [SerializeField] private Button _btnHit;
  [SerializeField] private Button _btnStand;
  [SerializeField] private TextMeshProUGUI _turnTimerLabel;

  private const float TurnTimeoutSeconds = 30f;
  private Coroutine _countdownCoroutine;

  private void Awake()
  {
    HideActionButtons();
  }

  public void Init(INetworkSender sender)
  {
    _btnHit.onClick.AddListener(() => sender.RequestHit());
    _btnStand.onClick.AddListener(() => sender.RequestStand());
  }

  public void ShowActionButtons()
  {
    SetButtons(true);
    StartCountdown();
  }

  public void HideActionButtons()
  {
    SetButtons(false);
    StopCountdown();
  }

  private void SetButtons(bool show)
  {
    _btnHit.gameObject.SetActive(show);
    _btnStand.gameObject.SetActive(show);
  }

  private void StartCountdown()
  {
    StopCountdown();
    if (_turnTimerLabel)
      _countdownCoroutine = StartCoroutine(CountdownCoroutine());
  }

  private void StopCountdown()
  {
    if (_countdownCoroutine != null)
    {
      StopCoroutine(_countdownCoroutine);
      _countdownCoroutine = null;
    }
    if (_turnTimerLabel) _turnTimerLabel.gameObject.SetActive(false);
  }

  private IEnumerator CountdownCoroutine()
  {
    float remaining = TurnTimeoutSeconds;
    _turnTimerLabel.gameObject.SetActive(true);
    while (remaining > 0f)
    {
      _turnTimerLabel.text = Mathf.CeilToInt(remaining).ToString();
      yield return new WaitForSeconds(1f);
      remaining -= 1f;
    }
    _turnTimerLabel.text = "0";
  }
}
