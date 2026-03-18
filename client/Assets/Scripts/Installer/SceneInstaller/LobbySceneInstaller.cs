
using UnityEngine;

public class LobbySceneInstaller : SceneInstaller
{
  [Header("GameView")]
  public GameLobbyView gameLobbyView;

  protected override void Initialize(DIContainerBase global)
  {
    var container = new DIContainerBase(global);

    var spawner = container.Get<ISpawnerHandle>();

    GameState.Instance.Initialze(WSClient.Instance);

    var lobbyDomain = new LobbyDomain();
    var lobbySystem = new LobbyService(lobbyDomain, WSClient.Instance);
    gameLobbyView.Initialze(lobbySystem);

    Destroy(gameObject);
  }
}
