using System;
using UnityEngine;
using System.Collections.Generic;

public class NetworkDispatcher : INetworkDispatcher
{
  private Dictionary<string, List<Action<string>>> _handlers =
    new Dictionary<string, List<Action<string>>>();

  public event Action OnWSConnected;

  public Action<string> Register<T>(string type, Action<T> handler)
  {
    if (!_handlers.ContainsKey(type))
      _handlers[type] = new List<Action<string>>();

    Action<string> wrapper = (json) =>
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

    _handlers[type].Add(wrapper);
    return wrapper;
  }

  public void Unregister(string type, Action<string> token)
  {
    if (_handlers.TryGetValue(type, out var list))
      list.Remove(token);
  }

  public void Dispatch(string json)
  {
    Debug.Log(json);
    var baseMsg = JsonUtility.FromJson<Response>(json);

    if (baseMsg == null || string.IsNullOrEmpty(baseMsg.type))
    {
      Debug.LogWarning("Invalid message format");
      return;
    }

    if (_handlers.TryGetValue(baseMsg.type, out var handlers))
    {
      foreach (var handler in new List<Action<string>>(handlers))
        handler.Invoke(json);
    }
    else
    {
      Debug.LogWarning($"No handler registered for type: {baseMsg.type}");
    }
  }

  public void OnConnected()
  {
    OnWSConnected?.Invoke();
  }
}
