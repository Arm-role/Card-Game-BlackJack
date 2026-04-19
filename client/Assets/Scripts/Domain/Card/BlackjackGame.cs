using System.Collections.Generic;

public class BlackjackGame
{
  private IDeck _deck;
  private List<BlackjackPlayer> _players = new();
  private BlackjackPlayer _dealer = new BlackjackPlayer(-1);

  public IReadOnlyList<BlackjackPlayer> Players => _players;
  public BlackjackPlayer Dealer => _dealer;

  public BlackjackGame(IDeck deck)
  {
    _deck = deck;
  }

  public void AddPlayer(int playerId)
  {
    _players.Add(new BlackjackPlayer(playerId));
  }

  public void StartGame()
  {
    // แจก 2 ใบ
    foreach (var p in _players)
    {
      p.Receive(_deck.Draw());
      p.Receive(_deck.Draw());
    }

    _dealer.Receive(_deck.Draw());
    _dealer.Receive(_deck.Draw());
  }

  public Card Hit(int playerId)
  {
    var player = _players.Find(p => p.Id == playerId);
    var card = _deck.Draw();
    player.Receive(card);
    return card;
  }

  public void DealerPlay()
  {
    while (_dealer.Hand.GetBestValue() < 17)
    {
      _dealer.Receive(_deck.Draw());
    }
  }
}
