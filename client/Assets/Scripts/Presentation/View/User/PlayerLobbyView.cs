using TMPro;
using UnityEngine;

public class PlayerLobbyView : MonoBehaviour
{
  [SerializeField] private TextMeshProUGUI _Username;
  [SerializeField] private TextMeshProUGUI _Chip;

  public void Setup(string username, int chipCount)
  {
    _Username.text = username;
    _Chip.text = $"chip : {chipCount}";
  }
}
