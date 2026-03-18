using UnityEngine;

public abstract class SceneInstaller : MonoBehaviour
{
  protected virtual void Start()
  {
    if (AppInstaller.IsReady)
      Initialize(AppInstaller.Container);
    else
      AppInstaller.OnServiceReady += Initialize;
  }

  protected virtual void OnDestroy() => AppInstaller.OnServiceReady -= Initialize;
  protected abstract void Initialize(DIContainerBase container);
}