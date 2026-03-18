
using UnityEngine;

public class LoginSceneInstaller : SceneInstaller
{
  [Header("GameView")]
  public GameMainMenuView gameMainMenuView;

  protected override void Initialize(DIContainerBase global)
  {
    var container = new DIContainerBase(global);
    gameMainMenuView.Initialze(WSClient.Instance);

    Destroy(gameObject);
  }
}