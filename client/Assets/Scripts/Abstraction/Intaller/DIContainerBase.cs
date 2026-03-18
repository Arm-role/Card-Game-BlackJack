using System;
using UnityEngine;
using System.Collections.Generic;
public class DIContainerBase
{
  private readonly DIContainerBase _parent;
  protected readonly Dictionary<Type, object> Objects;

  public DIContainerBase()
  {
    Objects = new Dictionary<Type, object>();
  }
  public DIContainerBase(DIContainerBase parent)
  {
    Objects = new Dictionary<Type, object>();
    _parent = parent;
  }
  protected DIContainerBase(Dictionary<Type, object> scripts)
  {
    Objects = scripts ?? new Dictionary<Type, object>();
  }


  public bool TryGet<T>(out T result)
  {
    if (Objects.TryGetValue(typeof(T), out var obj) && obj is T value)
    {
      result = value;
      return true;
    }
    else if (_parent != null)
    {
      return _parent.TryGet(out result);
    }

    result = default;
    return false;
  }
  public T Get<T>() where T : class
  {
    if (Objects.TryGetValue(typeof(T), out var obj) && obj is T value)
    {
      return value;
    }
    else if (_parent != null)
    {
      return _parent.Get<T>();
    }
    Debug.LogWarning($"[DIContainer] {typeof(T).Name} ?????? Register!");
    return null;
  }

  public void Register<T>(T script)
  {
    Objects[typeof(T)] = script;
  }

  public void Unregister<T>() => Objects.Remove(typeof(T));
}
