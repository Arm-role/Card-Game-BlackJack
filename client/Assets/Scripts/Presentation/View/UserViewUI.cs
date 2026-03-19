using System;
using UnityEngine;
using System.Collections.Generic;

public class UserViewUI : MonoBehaviour
{
  [SerializeField] private SeatViewUI[] _Seats;

  private List<SeatViewUI> _seats = new();

  public event Action<int> OnSeatClicked;

  public void SetSeats(IReadOnlyList<SeatData> seatDataList)
  {
    ClearSeats();

    for (int i = 0; i < seatDataList.Count; i++)
    {
      var seat = _Seats[i];
      seat.Setup(seatDataList[i]);

      seat.OnClickSeat += HandleSeatClicked;

      _seats.Add(seat);
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
