using UnityEngine;
using TMPro;
using UnityEngine.UI;

public class SeatSwapViewUI : MonoBehaviour
{
  [SerializeField] private GameObject _SeatSwapRoot;
  [SerializeField] private TMP_Text _Description;
  [SerializeField] private Button _AcceptButton;
  [SerializeField] private Button _CancelButton;

  private void Awake()
  {
    _SeatSwapRoot.SetActive(false);
  }

  public void Init(INetworkSender sender)
  {
    _AcceptButton.onClick.AddListener(() => { sender.RequestSwapResponse(true);  _SeatSwapRoot.SetActive(false); });
    _CancelButton.onClick.AddListener(() => { sender.RequestSwapResponse(false); _SeatSwapRoot.SetActive(false); });
  }

  public void Setup(SeatSwapData data)
  {
    _Description.text = $"{data.fromPlayerName} Request Swap";
    _SeatSwapRoot.SetActive(true);
  }

}