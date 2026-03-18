public interface IWSClient
{
  INetworkDispatcher Dispatcher { get; }
  void Send(object obj);
}