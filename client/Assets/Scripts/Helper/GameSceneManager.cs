using System;
using UnityEngine.SceneManagement;

public class GameSceneManager
{
  public static void LoadScene(string sceneName)
  {
    SceneManager.LoadScene(sceneName);
  }
}