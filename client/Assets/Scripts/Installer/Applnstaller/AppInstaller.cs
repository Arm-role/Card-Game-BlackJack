using System;
using UnityEngine;

public class AppInstaller : MonoBehaviour
{
  public static DIContainerBase Container;
  private static bool _isInitialzed = false;

  public static bool IsReady { get; private set; } = false;
  public static event Action<DIContainerBase> OnServiceReady;
  private void Awake()
  {
    if (_isInitialzed)
    {
      Destroy(gameObject);
      return;
    }

    DontDestroyOnLoad(gameObject);
    _isInitialzed = true;

    Container = new DIContainerBase();

    ISpawnerHandle spawnerService = new SpawnerHandle();

    Container.Register(spawnerService);

    IsReady = true;
    OnServiceReady?.Invoke(Container);
  }
}