using UnityEngine;

public class SpawnerHandle : MonoBehaviour
{
  public T Spawn<T>(T prefab, Transform parent) where T : Object
  {
    return Instantiate(prefab, parent);
  }

  public void Despawn(GameObject ob)
  {
    Destroy(ob);
  }
}