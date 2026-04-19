using System.Collections.Generic;
using System.Linq;

public class Hand
{
  private List<Card> _cards = new();

  public IReadOnlyList<Card> Cards => _cards;

  public void Add(Card card)
  {
    _cards.Add(card);
  }

  public int GetBestValue()
  {
    int total = _cards.Sum(c => c.GetValue());
    int aceCount = _cards.Count(c => c.Rank == Rank.Ace);

    while (total > 21 && aceCount > 0)
    {
      total -= 10;
      aceCount--;
    }

    return total;
  }

  public bool IsBust() => GetBestValue() > 21;
}