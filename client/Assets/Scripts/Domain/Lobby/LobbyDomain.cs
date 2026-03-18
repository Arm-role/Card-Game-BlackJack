using System;
using System.Collections.Generic;
using UnityEngine;

public class LobbyDomain
{
  private List<SeatData> _seats = new();
  public IReadOnlyList<SeatData> Seats => _seats;

  public event Action<IReadOnlyList<SeatData>> OnSeatUpdated;

  public LobbyDomain()
  {
    InitializeSeats();
  }

  private void InitializeSeats()
  {
    // 0 = Dealer
    _seats.Add(new SeatData
    {
      seatIndex = 0,
      role = SeatRole.Dealer
    });

    // 1-4 = Players
    for (int i = 1; i <= 4; i++)
    {
      _seats.Add(new SeatData
      {
        seatIndex = i,
        role = SeatRole.Player
      });
    }
  }

  public void AssignPlayer(SeatData seatData, bool silent = false)
  {
    var seat = _seats[seatData.seatIndex];

    seat = seatData;

    _seats[seatData.seatIndex] = seat;

    Debug.Log($"{seatData.playerId} {seatData.username} {seatData.chip} {seatData.seatIndex}");

    if (!silent)
      Notify();
  }

  public void SwapSeat(int fromIndex, int toIndex)
  {
    (_seats[fromIndex], _seats[toIndex]) =
      (_seats[toIndex], _seats[fromIndex]);

    Notify();
  }
  public bool CanStartGame()
  {
    int playerCount = 0;

    foreach (var seat in _seats)
    {
      if (!seat.IsEmpty)
      {
        if (seat.role == SeatRole.Player)
          playerCount++;
      }
    }

    return playerCount >= 2;
  }

  public void SetFromSnapshot(RoomData room)
  {
    _seats.Clear();
    InitializeSeats();

    foreach (var seat in room.seats)
      AssignPlayer(seat, true);

    Notify();
  }

  public void EnsureDealerBot()
  {
    var dealer = _seats[0];

    if (dealer.IsEmpty)
    {
      dealer.playerId = -1;
      dealer.username = "BOT";
      dealer.chip = 999999;

      _seats[0] = dealer;
    }
  }

  private void Notify()
  {
    EnsureDealerBot();
    OnSeatUpdated?.Invoke(_seats);
  }
}