using UnityEngine;

public class LobbySceneInstaller : SceneInstaller
{
  [Header("GameView")]
  public GameLobbyView gameLobbyView;
  public GameTableView gameTableView;

  protected override void Initialize(DIContainerBase global)
  {
    if (!GameState.Instance.IsInitialze)
      GameState.Instance.Initialze(WSClient.Instance.Router, GameInput.Instance);

    var router = WSClient.Instance.Router;
    var sender = new NetworkHelper(WSClient.Instance);

    var lobbyDomain = new LobbyDomain();
    var lobbySystem = new LobbyService(lobbyDomain, router, sender);
    gameLobbyView.Initialze(lobbySystem, sender);

    if (gameTableView != null && !gameTableView.IsGameplayWired)
    {
      gameTableView.SetupNetworking(sender);

      var gameplay = new GameplayLogic(gameTableView, router, gameTableView, sender);
      if (GameState.Instance.MySeatData != null)
        gameplay.SetMyPlayerId(GameState.Instance.MySeatData.playerId);

      if (GameState.Instance.CurrentRoom != null)
        gameplay.SyncRoomData(GameState.Instance.CurrentRoom);

      gameTableView.OnPlayAgainPressed += gameplay.OnPlayAgain;
      gameTableView.OnLeavePressed += gameplay.OnLeaveRoom;
      gameTableView.OnKickedDismissed += () => GameSceneManager.LoadScene("Login");
      gameTableView.MarkGameplayWired(gameplay);
    }

    Destroy(gameObject);
  }
}
