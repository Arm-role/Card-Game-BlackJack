
using UnityEngine;

public class LoginSceneInstaller : SceneInstaller
{
  [Header("GameView")]
  public GameMainMenuView gameMainMenuView;

  protected override void Initialize(DIContainerBase global)
  {
    var container = new DIContainerBase(global);

    GameState.Instance.Initialze(WSClient.Instance, GameInput.Instance);

    gameMainMenuView.Initialze(WSClient.Instance);

    Destroy(gameObject);
  }
}