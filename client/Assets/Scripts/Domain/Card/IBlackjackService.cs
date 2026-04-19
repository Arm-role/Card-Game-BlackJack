public interface IBlackjackService
{
  void StartGame();
  Card Hit(int playerId);
  void Stand(int playerId);
}