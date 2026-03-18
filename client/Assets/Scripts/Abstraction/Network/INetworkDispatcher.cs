using System;

public interface INetworkDispatcher
{
   event Action OnWSConnected;
   void Register<T>(string type, Action<T> handler);
   void Unregister(string type);
   void Dispatch(string json);
   void OnConnected();
}