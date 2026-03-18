using UnityEngine;

public interface ISpawnerHandle
{
  T Spawn<T>(T prefab, Transform parent) where T : Object;
  void Despawn(GameObject ob);
}