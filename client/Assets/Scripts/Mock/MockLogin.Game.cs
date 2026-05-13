using System.Collections;
using UnityEngine;

public partial class MockLogin
{
  // =====================================================
  // Game Update
  // =====================================================

  private void OnGameUpdateMessage(GameUpdateMessage msg)
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
        State = ClientGameState.WaitingTurn;
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

    switch (p.state)
    {
      case "DEALING":
        if (p.players == null || p.dealer == null) return;
        State = ClientGameState.Dealing;
        _table.ShowGameplay();
        _table.SetMyPlayerId(_myPlayerId);
        _table.SetMyName(_username);
        StartCoroutine(DealAfterFrame(p));
        break;

      case "WAITING":
        State = ClientGameState.GameOver;
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
                _table.ShowResult(r.playerId, r.result);
                if (r.playerId == _myPlayerId)
                {
                  _myChip = r.chipAfter;
                  _table.UpdateMyChip(_myChip);
                }
              }
            });
        });
        break;
    }
  }

  private void HandleTurnChanged(int currentPlayer)
  {
    Debug.Log($"[turn_changed] currentPlayer={currentPlayer}");
    _table.SetTurn(currentPlayer);
    if (currentPlayer == _myPlayerId)
    {
      State = ClientGameState.MyTurn;
      _table.ShowActionButtons();
      Debug.Log("⭐ YOUR TURN");
    }
    else
    {
      State = ClientGameState.WaitingTurn;
      _table.HideActionButtons();
    }
  }

  // =====================================================
  // Game Event
  // =====================================================

  private void OnGameEventMessage(GameEventMessage msg)
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
          if (h.status == "BUST")
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

  // =====================================================
  // Post-game Actions
  // =====================================================

  private void OnPlayAgain()
  {
    State = ClientGameState.InRoom;
    _table.ResetWhenReady(() =>
    {
      if (_myPlayerId == _hostId)
        NetworkHelper.RequestStartGame();
    });
  }

  private void OnLeaveRoom()
  {
    _table.ResetWhenReady(() =>
    {
      _table.ShowLobby();
      NetworkHelper.RequestLeaveRoom();
    });
  }

  private IEnumerator DealAfterFrame(GameUpdatePayload p)
  {
    yield return null;
    _table.DealInitialCards(p.players, p.dealer, _myPlayerId, () =>
    {
      Debug.Log("[deal] done → RequestPlayerReady");
      _table.ShowWaitingForPlayers();
      NetworkHelper.RequestPlayerReady();
    });
  }
}
