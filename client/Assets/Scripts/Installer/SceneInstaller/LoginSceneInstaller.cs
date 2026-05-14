using UnityEngine;

public class LoginSceneInstaller : SceneInstaller
{
  [Header("GameView")]
  public GameMainMenuView gameMainMenuView;
  [SerializeField] private ClaimChipHandler claimChipHandler;

  protected override void Initialize(DIContainerBase global)
  {
    var router = WSClient.Instance.Router;
    var sender = new NetworkHelper(WSClient.Instance);

    GameState.Instance.Initialze(router, GameInput.Instance);
    gameMainMenuView.Initialze(router, sender);

    if (claimChipHandler != null)
      claimChipHandler.Init(router, sender);

    Destroy(gameObject);
  }
}
