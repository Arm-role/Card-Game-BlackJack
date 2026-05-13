using System;

public interface INetworkDispatcher
{
   event Action OnWSConnected;
   Action<string> Register<T>(string type, Action<T> handler);
   void Unregister(string type, Action<string> token);
   void Dispatch(string json);
   void OnConnected();
}
