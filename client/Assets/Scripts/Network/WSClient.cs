using NativeWebSocket;
using System.Text;
using UnityEngine;

public class WSClient : MonoBehaviour
{
  private WebSocket websocket;
  public static WSClient Instance { get; private set; }

  private const string SERVER_URL = "ws://localhost:2567";

  public NetworkDispatcher Dispatcher { get; private set; }

  private void Awake()
  {
    if (Instance == null)
    {
      Instance = this;
      DontDestroyOnLoad(gameObject);
      Dispatcher = new NetworkDispatcher();
    }
    else
    {
      Destroy(gameObject);
    }
  }

  async void Start()
  {
    await Connect();
  }

  private async System.Threading.Tasks.Task Connect()
  {
    websocket = new WebSocket(SERVER_URL);

    websocket.OnOpen += () =>
    {
      Debug.Log("WS Connected");
    };

    websocket.OnMessage += (bytes) =>
    {
      var json = Encoding.UTF8.GetString(bytes);
      Dispatcher.Dispatch(json);
    };

    websocket.OnError += (e) =>
    {
      Debug.LogError("WS Error: " + e);
    };

    websocket.OnClose += (e) =>
    {
      Debug.LogWarning("WS Closed");
    };

    await websocket.Connect();
  }

  public async void Send(object obj)
  {
    if (websocket.State != WebSocketState.Open)
      return;

    string json;

    if (obj is string str)
    {
      json = str;
    }
    else
    {
      json = JsonUtility.ToJson(obj);
    }

    Debug.Log(json);
    await websocket.SendText(json);
  }

  void Update()
  {
#if !UNITY_WEBGL || UNITY_EDITOR
    websocket?.DispatchMessageQueue();
#endif
  }
}