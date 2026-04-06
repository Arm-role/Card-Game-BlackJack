
using UnityEngine;

public class LobbySceneInstaller : SceneInstaller
{
  [Header("GameView")]
  public GameLobbyView gameLobbyView;

  protected override void Initialize(DIContainerBase global)
  {
    var container = new DIContainerBase(global);

    if (!GameState.Instance.IsInitialze)
      GameState.Instance.Initialze(WSClient.Instance, GameInput.Instance);

    var spawner = container.Get<ISpawnerHandle>();

    var lobbyDomain = new LobbyDomain();
    var lobbySystem = new LobbyService(lobbyDomain, WSClient.Instance);
    gameLobbyView.Initialze(lobbySystem);

    Destroy(gameObject);
  }
}