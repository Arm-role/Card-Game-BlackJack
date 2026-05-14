using System;
using System.Text;
using UnityEngine;
using NativeWebSocket;
using System.Threading.Tasks;

#if UNITY_EDITOR
using UnityEditor;
#endif

public class WSClient : MonoBehaviour, IWSClient
{
  public static WSClient Instance { get; private set; }

  private const string SERVER_URL = "ws://localhost:2567";

  private WebSocket websocket;
  private bool _isConnecting = false;
  private bool _isQuitting = false;

  public INetworkDispatcher Dispatcher { get; private set; }
  public IMessageRouter Router { get; private set; }  // concrete only — not on IWSClient

  #region Unity Lifecycle

  private void Awake()
  {
    if (Instance == null)
    {
      Instance = this;
      DontDestroyOnLoad(gameObject);
      Dispatcher = new NetworkDispatcher();
      Router = new MessageRouter(Dispatcher);
    }
    else
    {
      Destroy(gameObject);
      return;
    }
  }

  private async void Start()
  {
    await Connect();
  }

  private async void OnApplicationQuit()
  {
    _isQuitting = true;
    await Disconnect();
  }

  private async void OnDestroy()
  {
    if (Instance == this)
      Instance = null;

    if (!_isQuitting)
      await Disconnect();
  }

#if UNITY_EDITOR
  private void OnEnable()
  {
    EditorApplication.playModeStateChanged += OnPlayModeChanged;
  }

  private void OnDisable()
  {
    EditorApplication.playModeStateChanged -= OnPlayModeChanged;
  }

  private async void OnPlayModeChanged(PlayModeStateChange state)
  {
    if (state == PlayModeStateChange.ExitingPlayMode)
    {
      await Disconnect();
    }
  }
#endif

  private void Update()
  {
#if !UNITY_WEBGL || UNITY_EDITOR
    websocket?.DispatchMessageQueue();
#endif
  }

  #endregion

  #region Connection

  public async Task Connect()
  {
    if (_isConnecting || websocket != null)
      return;

    _isConnecting = true;

    websocket = new WebSocket(SERVER_URL);

    websocket.OnOpen += () =>
    {
      Debug.Log("WS Connected");
      Dispatcher?.OnConnected();
    };

    websocket.OnMessage += (bytes) =>
    {
      if (_isQuitting) return;

      var json = Encoding.UTF8.GetString(bytes);
      Dispatcher?.Dispatch(json);
    };

    websocket.OnError += (e) =>
    {
      Debug.LogError("WS Error: " + e);
    };

    websocket.OnClose += (e) =>
    {
      Debug.LogWarning("WS Closed");
      websocket = null;
    };

    try
    {
      await websocket.Connect();
    }
    catch (Exception e)
    {
      Debug.LogError("WS Connect failed: " + e.Message);
      websocket = null;
    }

    _isConnecting = false;
  }

  public async Task Disconnect()
  {
    if (websocket == null)
      return;

    try
    {
      await websocket.Close();
    }
    catch (Exception e)
    {
      Debug.LogWarning("WS Close failed: " + e.Message);
    }

    websocket = null;
  }

  #endregion

  #region Send

  public async void Send(object obj)
  {
    if (websocket == null || websocket.State != WebSocketState.Open)
      return;

    string json = obj is string str ? str : JsonUtility.ToJson(obj);

    Debug.Log($"[WS SEND] {json}");

    try
    {
      await websocket.SendText(json);
    }
    catch (Exception e)
    {
      Debug.LogError("WS Send failed: " + e.Message);
    }
  }

  #endregion
}