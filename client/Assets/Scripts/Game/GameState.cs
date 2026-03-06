using System;
using UnityEngine;

public class GameState : MonoBehaviour
{
  public static GameState Instance { get; private set; }

  public RoomData CurrentRoom { get; private set; }

  public event Action<RoomData> OnRoomUpdated;

  private void Awake()
  {
    if (Instance != null)
    {
      Destroy(gameObject);
      return;
    }

    Instance = this;
    DontDestroyOnLoad(gameObject);
  }

  public void SetRoomData(RoomData roomData)
  {
    CurrentRoom = roomData;

    // Notify UI
    OnRoomUpdated?.Invoke(roomData);
  }

  public void ClearRoom()
  {
    CurrentRoom = null;
    OnRoomUpdated?.Invoke(null);
  }
}