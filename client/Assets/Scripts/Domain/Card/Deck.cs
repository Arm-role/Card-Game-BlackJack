using System;
using System.Collections.Generic;

public class Deck : IDeck
{
  private Stack<Card> _cards;
  private Random _rng;

  public Deck(int seed = 0)
  {
    _rng = seed == 0 ? new Random() : new Random(seed);
    Initialize();
    Shuffle();
  }

  private void Initialize()
  {
    var list = new List<Card>();

    foreach (Suit suit in Enum.GetValues(typeof(Suit)))
    {
      foreach (Rank rank in Enum.GetValues(typeof(Rank)))
      {
        list.Add(new Card { Suit = suit, Rank = rank });
      }
    }

    _cards = new Stack<Card>(list);
  }

  public void Shuffle()
  {
    var list = new List<Card>(_cards);
    int n = list.Count;

    while (n > 1)
    {
      n--;
      int k = _rng.Next(n + 1);
      (list[k], list[n]) = (list[n], list[k]);
    }

    _cards = new Stack<Card>(list);
  }

  public Card Draw()
  {
    if (_cards.Count == 0)
      throw new InvalidOperationException("Deck empty");

    return _cards.Pop();
  }
}
