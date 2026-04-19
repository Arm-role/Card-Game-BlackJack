using System.Collections.Generic;

public class FakeDeck : IDeck
{
  private Queue<Card> _cards;

  public FakeDeck(IEnumerable<Card> cards)
  {
    _cards = new Queue<Card>(cards);
  }

  public Card Draw()
  {
    return _cards.Dequeue();
  }
}