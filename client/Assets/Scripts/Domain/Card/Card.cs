public enum Suit { Hearts, Diamonds, Clubs, Spades }

public enum Rank
{
  Two = 2, Three, Four, Five, Six, Seven, Eight, Nine, Ten,
  Jack, Queen, King, Ace
}

public struct Card
{
  public Suit Suit;
  public Rank Rank;

  public int GetValue()
  {
    if (Rank >= Rank.Two && Rank <= Rank.Ten)
      return (int)Rank;

    if (Rank == Rank.Ace)
      return 11;

    return 10;
  }
}
