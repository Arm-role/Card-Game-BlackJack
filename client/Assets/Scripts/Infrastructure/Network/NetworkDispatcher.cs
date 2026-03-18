using System;
using UnityEngine;
using System.Collections.Generic;

public class NetworkDispatcher : INetworkDispatcher
{
  private Dictionary<string, List<Action<string>>> _handlers =
    new Dictionary<string, List<Action<string>>>();

  public event Action OnWSConnected;

  public void Register<T>(string type, Action<T> handler)
  {
    if (!_handlers.ContainsKey(type))
      _handlers[type] = new List<Action<string>>();

    _handlers[type].Add((json) =>
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
    });
  }

  public void Unregister(string type)
  {
    _handlers.Remove(type);
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
      foreach (var handler in handlers)
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