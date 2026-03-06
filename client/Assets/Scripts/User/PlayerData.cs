using System;
using System.Collections.Generic;

[Serializable]
public class PlayerData
{
  public string id;
  public string username;
  public string chip;
}

[Serializable]
public class MatchState
{
  public string matchId;
  public string currentTurnPlayerId;
  public List<PlayerMatchData> players;
  public bool isFinished;
}

[Serializable]
public class PlayerMatchData
{
  public string playerId;
  public int hp;
  public int energy;
}