using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class ResultView : MonoBehaviour
{
  [SerializeField] private TextMeshProUGUI _resultPopupLabel;
  [SerializeField] private GameObject _resultPopupPanel;
  [SerializeField] private Button _btnPlayAgain;
  [SerializeField] private Button _btnLeaveFromResult;

  public event Action OnPlayAgainPressed;
  public event Action OnLeavePressed;

  private void Awake()
  {
    _btnPlayAgain.onClick.AddListener(() => OnPlayAgainPressed?.Invoke());
    _btnLeaveFromResult.onClick.AddListener(OnClickLeave);
    HideResult();
  }

  public void ShowMyResult(string result)
  {
    if (_resultPopupPanel) _resultPopupPanel.SetActive(true);
    if (_resultPopupLabel)
    {
      _resultPopupLabel.text = result;
      _resultPopupLabel.color = ResultColor(result);
    }
  }

  public void HideResult()
  {
    if (_resultPopupPanel) _resultPopupPanel.SetActive(false);
  }

  public void SetPlayAgainVisible(bool visible)
  {
    if (_btnPlayAgain) _btnPlayAgain.gameObject.SetActive(visible);
  }

  public void HideAllButtons()
  {
    if (_btnPlayAgain) _btnPlayAgain.gameObject.SetActive(false);
    if (_btnLeaveFromResult) _btnLeaveFromResult.gameObject.SetActive(false);
  }

  private void OnClickLeave()
  {
    OnLeavePressed?.Invoke(); // GameplayLogic.OnLeaveRoom handles RequestLeaveRoom
  }

  private Color ResultColor(string result) => result switch
  {
    "WIN" => new Color(0.2f, 0.85f, 0.2f),
    "LOSE" => new Color(0.9f, 0.2f, 0.2f),
    "DRAW" => new Color(0.9f, 0.75f, 0.1f),
    _ => Color.white,
  };
}
