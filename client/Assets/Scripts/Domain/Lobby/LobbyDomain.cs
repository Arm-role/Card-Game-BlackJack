using System;
using System.Collections.Generic;
using UnityEngine;

public class LobbyDomain
{
  private Dictionary<int, SeatData> _seats = new();

  public IReadOnlyDictionary<int, SeatData> Seats => _seats;

  public event Action<IReadOnlyDictionary<int, SeatData>> OnSeatUpdated;

  public LobbyDomain()
  {
    InitializeSeats();
  }

  private void InitializeSeats()
  {
    _seats.Clear();

    // Dealer
    _seats[0] = new SeatData
    {
      seatIndex = 0,
      role = (int)SeatRole.Dealer
    };

    // Players (1–4)
    for (int i = 1; i <= 4; i++)
    {
      _seats[i] = new SeatData
      {
        seatIndex = i,
        role = (int)SeatRole.Player
      };
    }
  }

  // =========================
  // Assign / Update
  // =========================

  public void AssignPlayer(SeatData seatData, bool silent = false)
  {
    if (!_seats.ContainsKey(seatData.seatIndex))
    {
      Debug.LogWarning($"Seat not found, creating new: {seatData.seatIndex}");
      _seats[seatData.seatIndex] = seatData;
    }
    else
    {
      _seats[seatData.seatIndex] = seatData;
    }

    Debug.Log($"Assign: {seatData.playerId} {seatData.username} seat:{seatData.seatIndex}");

    if (!silent)
      Notify();
  }

  // =========================
  // Swap
  // =========================

  public void SwapSeat(int fromIndex, int toIndex)
  {
    if (!_seats.ContainsKey(fromIndex) || !_seats.ContainsKey(toIndex))
    {
      Debug.LogError("Swap failed: seat not found");
      return;
    }

    var temp = _seats[fromIndex];
    _seats[fromIndex] = _seats[toIndex];
    _seats[toIndex] = temp;

    // 🔥 สำคัญ: fix seatIndex ให้ตรง
    _seats[fromIndex].seatIndex = fromIndex;
    _seats[toIndex].seatIndex = toIndex;

    Notify();
  }

  // =========================
  // Snapshot Sync
  // =========================

  public void SetFromSnapshot(RoomData room)
  {
    InitializeSeats();

    foreach (var seat in room.seats)
    {
      AssignPlayer(seat, true);
    }

    Notify();
  }

  // =========================
  // Game Logic
  // =========================

  public bool CanStartGame()
  {
    int playerCount = 0;

    foreach (var seat in _seats.Values)
    {
      if (!seat.IsEmpty && seat.IsPlayer)
        playerCount++;
    }

    return playerCount >= 2;
  }

  public void EnsureDealerBot()
  {
    if (!_seats.ContainsKey(0)) return;

    var dealer = _seats[0];

    if (dealer.IsEmpty)
    {
      dealer.playerId = -1;
      dealer.username = "BOT";
      dealer.chip = 999999;

      _seats[0] = dealer;
    }
  }

  // =========================
  // Notify
  // =========================

  private void Notify()
  {
    EnsureDealerBot();
    OnSeatUpdated?.Invoke(_seats);
  }
}