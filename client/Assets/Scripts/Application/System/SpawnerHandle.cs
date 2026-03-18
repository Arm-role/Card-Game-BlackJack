using UnityEngine;

public class SpawnerHandle : ISpawnerHandle
{
  public T Spawn<T>(T prefab, Transform parent) where T : Object
  {
    return Object.Instantiate(prefab, parent);
  }

  public void Despawn(GameObject ob)
  {
    Object.Destroy(ob);
  }
}