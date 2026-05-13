using UnityEngine;

public partial class MockLogin
{
  // =====================================================
  // Room Result
  // =====================================================

  private void OnRoomMessage(RoomResultMessage msg)
  {
    if (msg.success)
    {
      switch (msg.action)
      {
        case "create":
        case "join":
        case "quick_join":
          _myPlayerId = msg.seat?.playerId ?? 0;
          Debug.Log($"[room] ✅ Entered | myId={_myPlayerId}");
          State = ClientGameState.InRoom;
          break;
        case "leave":
          _table.ShowLobby();
          State = ClientGameState.Authenticated;
          break;
      }
    }
    else
    {
      Debug.LogWarning($"[room] ❌ {msg.action} | reason={msg.reason}");
      switch (msg.reason)
      {
        case "INSUFFICIENT_CHIP":
          _table.ShowKickedPanel($"chip ไม่ถึง {_minChip:N0} — เข้าห้องไม่ได้");
          break;
        case "OUT_OF_CHIP":
          _table.HideResultButtons();
          State = ClientGameState.Authenticated;
          Invoke(nameof(ShowKickedAfterResult), 3f);
          break;
        case "NOT_HOST":
          Debug.LogWarning("[room] คุณไม่ใช่ host");
          break;
      }
      if (msg.action == "quick_join") OnCreateRoom();
    }
  }

  // =====================================================
  // Room Update
  // =====================================================

  private void OnRoomUpdateMessage(RoomUpdateMessage msg)
  {
    switch (msg.action)
    {
      case "snapshot":
        var r = msg.room;
        _hostId = r.hostId;
        _minChip = r.minChip;
        _betAmount = r.betAmount;
        Debug.Log($"[room_update] roomId={r.roomId} host={r.hostId} minChip={r.minChip:N0} bet={r.betAmount:N0} {r.player_count}/{r.max_player_count}");
        _table.UpdateHostUI(_myPlayerId == _hostId);
        _table.UpdateMinChipLabel(_minChip);
        _table.UpdateBetAmount(_betAmount);
        if (r.seats != null)
        {
          var mySeat = r.seats.Find(s => s.playerId == _myPlayerId);
          if (mySeat != null)
          {
            _myChip = mySeat.chip;
            _table.UpdateMyChip(_myChip);
          }
        }
        break;

      case "host_changed":
        _hostId = msg.hostChanged?.hostId ?? 0;
        Debug.Log($"[room_update] host_changed → {_hostId}");
        _table.UpdateHostUI(_myPlayerId == _hostId);
        if (_myPlayerId == _hostId) Debug.Log("⭐ คุณเป็น host ใหม่");
        break;

      case "players_kicked":
        var pk = msg.payload;
        if (pk?.kickedIds == null) break;
        foreach (var id in pk.kickedIds)
          Debug.Log($"[room_update] player {id} ถูกเตะ เหตุ: {pk.reason}");
        break;
    }
  }

  private void ShowKickedAfterResult()
  {
    _table.HideResult();
    _table.ShowKickedPanel("chip หมดแล้ว — ถูกเตะออกจากห้อง");
  }

  private void OnErrorMessage(ErrorMessage msg) =>
      Debug.LogError($"[error] {msg.reason}");

  private void OnGameResultMessage(GameResultMessage msg)
  {
    if (msg.success) return;
    Debug.LogWarning($"[game_result] ❌ {msg.action} {msg.reason}");
    if (msg.reason == "NOT_HOST")
      Debug.LogWarning("[game_result] คุณไม่ใช่ host");
  }
}
