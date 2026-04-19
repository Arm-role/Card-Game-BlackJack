public class BlackjackPlayer
{
  public int Id { get; }
  public Hand Hand { get; } = new();

  public BlackjackPlayer(int id)
  {
    Id = id;
  }

  public void Receive(Card card)
  {
    Hand.Add(card);
  }
}