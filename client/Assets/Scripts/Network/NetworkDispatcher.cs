using System;
using System.Collections.Generic;
using UnityEngine;

public class NetworkDispatcher
{
  private Dictionary<string, Action<string>> _handlers =
      new Dictionary<string, Action<string>>();

  // Register แบบ generic
  public void Register<T>(string type, Action<T> handler)
  {
    _handlers[type] = (json) =>
    {
      try
      {
        var message = JsonUtility.FromJson<T>(json);
        handler.Invoke(message);
      }
      catch (Exception e)
      {
        Debug.LogError($"Failed to parse message type {type}: {e}");
      }
    };
  }

  public void Unregister(string type)
  {
    _handlers.Remove(type);
  }

  public void Dispatch(string json)
  {
    Debug.Log(json);
    var baseMsg = JsonUtility.FromJson<BaseMessage>(json);

    if (baseMsg == null || string.IsNullOrEmpty(baseMsg.type))
    {
      Debug.LogWarning("Invalid message format");
      return;
    }

    if (_handlers.TryGetValue(baseMsg.type, out var handler))
    {
      handler.Invoke(json);
    }
    else
    {
      Debug.LogWarning($"No handler registered for type: {baseMsg.type}");
    }
  }
}