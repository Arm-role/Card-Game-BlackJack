using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class ClaimChipHandler : MonoBehaviour
{
  [SerializeField] private Button _claimButton;
  [SerializeField] private TMP_Text _chipLabel;

  public event Action<int> OnSuccess;
  public event Action<string> OnFailed;

  public void Init(IMessageRouter router, INetworkSender sender)
  {
    router.OnClaimChipResult += OnClaimChipResult;
    _claimButton.onClick.AddListener(() => sender.RequestClaimChip());
  }

  private void OnClaimChipResult(ClaimChipResultMessage msg)
  {
    if (!msg.success)
    {
      Debug.LogWarning($"[claim_chip] ❌ {msg.reason}");
      OnFailed?.Invoke(msg.reason);
      return;
    }
    Debug.Log($"[claim_chip] ✅ +{msg.chip:N0}");
    if (_chipLabel != null)
      _chipLabel.text = msg.chip.ToString("N0");
    OnSuccess?.Invoke(msg.chip);
  }
}
