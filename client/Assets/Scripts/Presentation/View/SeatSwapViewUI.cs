using UnityEngine;
using TMPro;
using UnityEngine.UI;

public class SeatSwapViewUI : MonoBehaviour
{
  [SerializeField] private GameObject _SeatSwapRoot;
  [SerializeField] private TMP_Text _Description;
  [SerializeField] private Button _AcceptButton;
  [SerializeField] private Button _CancelButton;

  private void Start()
  {
    _AcceptButton.onClick.AddListener(OnAccept);
    _CancelButton.onClick.AddListener(OnCancel);

    _SeatSwapRoot.SetActive(false);
  }

  public void Setup(SeatSwapData data)
  {
    _Description.text = $"{data.fromPlayerName} Request Swap";
    _SeatSwapRoot.SetActive(true);
  }

  private void OnAccept()
  {
    NetworkHelper.RequestSwapResponse(true);
    _SeatSwapRoot.SetActive(false);

  }

  private void OnCancel()
  {
    NetworkHelper.RequestSwapResponse(false);
    _SeatSwapRoot.SetActive(false);
  }

}