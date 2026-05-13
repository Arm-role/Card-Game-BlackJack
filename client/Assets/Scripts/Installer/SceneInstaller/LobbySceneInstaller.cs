using UnityEngine;

public class LobbySceneInstaller : SceneInstaller
{
  [Header("GameView")]
  public GameLobbyView gameLobbyView;
  public GameTableView gameTableView;

  protected override void Initialize(DIContainerBase global)
  {
    var container = new DIContainerBase(global);

    if (!GameState.Instance.IsInitialze)
      GameState.Instance.Initialze(WSClient.Instance, GameInput.Instance);

    var spawner = container.Get<ISpawnerHandle>();

    var lobbyDomain = new LobbyDomain();
    var lobbySystem = new LobbyService(lobbyDomain, WSClient.Instance);
    gameLobbyView.Initialze(lobbySystem);

    if (gameTableView != null && !gameTableView.IsGameplayWired)
    {
      var gameplay = new GameplayLogic(gameTableView, WSClient.Instance, gameTableView);
      if (GameState.Instance.MySeatData != null)
        gameplay.SetMyPlayerId(GameState.Instance.MySeatData.playerId);

      if (GameState.Instance.CurrentRoom != null)
        gameplay.SyncRoomData(GameState.Instance.CurrentRoom);

      gameTableView.OnPlayAgainPressed += gameplay.OnPlayAgain;
      gameTableView.OnLeavePressed += gameplay.OnLeaveRoom;
      gameTableView.OnKickedDismissed += () => GameSceneManager.LoadScene("Login");
      gameTableView.MarkGameplayWired();
    }

    Destroy(gameObject);
  }
}