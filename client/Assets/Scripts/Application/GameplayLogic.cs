using System;
using System.Collections;
using UnityEngine;

public class GameplayLogic
{
  private readonly ICoroutineRunner _runner;
  private readonly IGameTableView _table;
  private readonly IMessageRouter _router;
  private readonly INetworkSender _sender;

  private int _myPlayerId;
  private int _hostId;
  private int _myChip;
  private int _betAmount;
  private int _minChip;

  private readonly ClientSessionState _session = new();
  public ClientGameState State => _session.Current;
  public int MinChip => _minChip;

  public GameplayLogic(ICoroutineRunner runner, IMessageRouter router, IGameTableView table, INetworkSender sender)
  {
    _runner = runner;
    _table = table;
    _router = router;
    _sender = sender;

    _router.OnRoomResult += OnRoomResult;
    _router.OnRoomUpdate += OnRoomUpdate;
    _router.OnGameResult += OnGameResult;
    _router.OnGameUpdate += OnGameUpdate;
    _router.OnGameEvent += OnGameEvent;
    _router.OnError += OnError;
  }

  public void Dispose()
  {
    _router.OnRoomResult -= OnRoomResult;
    _router.OnRoomUpdate -= OnRoomUpdate;
    _router.OnGameResult -= OnGameResult;
    _router.OnGameUpdate -= OnGameUpdate;
    _router.OnGameEvent -= OnGameEvent;
    _router.OnError -= OnError;
  }

  public void SetMyPlayerId(int id) => _myPlayerId = id;

  public void SyncRoomData(RoomData room)
  {
    if (room == null) return;
    _hostId = room.hostId;
    _minChip = room.minChip;
    _betAmount = room.betAmount;
    _table.UpdateHostUI(_myPlayerId == _hostId);
    _table.UpdateMinChipLabel(_minChip);
    _table.UpdateBetAmount(_betAmount);
    var mySeat = room.seats?.Find(s => s.playerId == _myPlayerId);
    if (mySeat != null)
    {
      _myChip = mySeat.chip;
      _table.UpdateMyChip(_myChip);
    }
  }

  // ─── Room Entry ───────────────────────────────────────

  private void OnRoomResult(RoomResultMessage msg)
  {
    if (!msg.success && msg.action == "kicked" && msg.reason == "OUT_OF_CHIP")
    {
      _table.HideResultButtons();
      _session.ToAuthenticated();
      _runner.StartCoroutine(ShowKickedAfterDelay());
    }
  }

  private IEnumerator ShowKickedAfterDelay()
  {
    yield return new WaitForSeconds(3f);
    _table.HideResult();
    _table.ShowKickedPanel("Out of chips — you have been removed from the room.");
  }

  // ─── Room Update ──────────────────────────────────────

  private void OnRoomUpdate(RoomUpdateMessage msg)
  {
    switch (msg.action)
    {
      case "snapshot":
        Debug.Log($"[room_update] snapshot roomId={msg.room?.roomId} {msg.room?.player_count}/{msg.room?.max_player_count}");
        SyncRoomData(msg.room);
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

  // ─── Game Result / Error ──────────────────────────────

  private void OnGameResult(GameResultMessage msg)
  {
    if (msg.success) return;
    Debug.LogWarning($"[game_result] ❌ {msg.action} {msg.reason}");
    if (msg.reason == "NOT_HOST")
      Debug.LogWarning("[game_result] คุณไม่ใช่ host");
  }

  private void OnError(ErrorMessage msg) =>
      Debug.LogError($"[error] {msg.reason}");

  // ─── Game Update ──────────────────────────────────────

  private void OnGameUpdate(GameUpdateMessage msg)
  {
    switch (msg.action)
    {
      case "start":
        Debug.Log($"[game_update] start roomId={msg.payload?.roomId}");
        break;
      case "state_changed":
        HandleStateChanged(msg.payload);
        break;
      case "ready_to_act":
        _table.HideWaitingForPlayers();
        _session.ToWaitingTurn();
        Debug.Log("[game_update] ready_to_act");
        break;
      case "turn_changed":
        HandleTurnChanged(msg.payload?.currentPlayer ?? 0);
        break;
    }
  }

  private void HandleStateChanged(GameUpdatePayload p)
  {
    if (p == null) return;
    Debug.Log($"[state_changed] {p.state}");

    if (p.State == ServerGameState.Dealing)
    {
      if (p.players == null || p.dealer == null) return;
      _session.ToDealing();
      _table.ShowGameplay();
      _table.SetMyPlayerId(_myPlayerId);
      _table.SetMyName(GameState.Instance.AccountUsername ?? "");
      _runner.StartCoroutine(DealAfterFrame(p));
    }
    else if (p.State == ServerGameState.Waiting)
    {
      Waiting(p);
    }
  }

  private void Waiting(GameUpdatePayload p)
  {
    _session.ToGameOver();
    _table.HideActionButtons();
    var snapshot = p;
    _table.RevealAllWhenReady(() =>
    {
      _table.RevealDealerAndShowResult(
        snapshot.dealer, snapshot.players, snapshot.results, _myPlayerId,
        results =>
        {
          if (results == null) return;
          foreach (var r in results)
          {
            Debug.Log($"  player[{r.playerId}] → {r.result}  chip={r.chipAfter:N0}");
            _table.ShowResult(r.playerId, r.Result);
            if (r.playerId == _myPlayerId)
            {
              _myChip = r.chipAfter;
              _table.UpdateMyChip(_myChip);
            }
          }
        });
    });
  }

  private void HandleTurnChanged(int currentPlayer)
  {
    Debug.Log($"[turn_changed] currentPlayer={currentPlayer}");
    _table.SetTurn(currentPlayer);
    if (currentPlayer == _myPlayerId)
    {
      _session.ToMyTurn();
      _table.ShowActionButtons();
      Debug.Log("⭐ YOUR TURN");
    }
    else
    {
      _session.ToWaitingTurn();
      _table.HideActionButtons();
    }
  }

  // ─── Game Event ───────────────────────────────────────

  private void OnGameEvent(GameEventMessage msg)
  {
    switch (msg.action)
    {
      case "player_hit":
        var h = msg.payload;
        if (h?.card == null) return;
        Debug.Log($"[player_hit] player={h.player_id} {h.card} score={h.score} status={h.status}");
        _table.AddCard(h.card, h.score, h.player_id);
        if (h.player_id == _myPlayerId)
        {
          if (h.Status == PlayerStatus.Bust)
          {
            Debug.Log("💥 BUST");
            _table.HideActionButtons();
          }
          else
          {
            _table.ShowActionButtons();
          }
        }
        break;

      case "player_stand":
        var s = msg.payload;
        Debug.Log($"[player_stand] player={s.player_id}");
        if (s.player_id == _myPlayerId)
          _table.HideActionButtons();
        break;
    }
  }

  // ─── Post-game Actions ────────────────────────────────

  public void OnPlayAgain()
  {
    _session.ToInRoom();
    _table.ResetWhenReady(() =>
    {
      if (_myPlayerId == _hostId)
        _sender.RequestStartGame();
    });
  }

  public void OnLeaveRoom()
  {
    _table.ResetWhenReady(() => _sender.RequestLeaveRoom());
  }

  // ─── Coroutines ───────────────────────────────────────

  private IEnumerator DealAfterFrame(GameUpdatePayload p)
  {
    yield return null;
    _table.DealInitialCards(p.players, p.dealer, _myPlayerId, () =>
    {
      Debug.Log("[deal] done → RequestPlayerReady");
      _table.ShowWaitingForPlayers();
      _sender.RequestPlayerReady();
    });
  }
}
