using System;
using UnityEngine;
using System.Collections.Generic;

public class UserViewUI : MonoBehaviour
{
  [SerializeField] private SeatViewUI[] _Seats;

  private List<SeatViewUI> _seats = new();

  public event Action<int> OnSeatClicked;

  public void SetSeats(IReadOnlyDictionary<int, SeatData> seats)
  {
    ClearSeats();

    foreach (var kv in seats)
    {
      int seatIndex = kv.Key;
      var seatData = kv.Value;
      var seatUI = _Seats[seatData.seatIndex];

      seatUI.Setup(seatData);
      seatUI.OnClickSeat += HandleSeatClicked;

      _seats.Add(seatUI);
    }
  }

  private void HandleSeatClicked(int index)
  {
    OnSeatClicked?.Invoke(index);
  }

  private void ClearSeats()
  {
    for (int i = 0; i < _seats.Count; i++)
    {
      var seat = _Seats[i];
      seat.Clear();

      seat.OnClickSeat -= HandleSeatClicked;
    }
    _seats.Clear();
  }
}
