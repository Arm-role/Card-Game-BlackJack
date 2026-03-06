using System;
using UnityEngine;

public class UISwip : MonoBehaviour
{
  [SerializeField] private UISwipData[] _AllUI;

  [Serializable]
  public class UISwipData
  {
    public string Name;
    public GameObject[] GameObject;
  }

  public void ActiveUIOnly(string Name)
  {
    foreach (var ui in _AllUI)
    {
      foreach (var ob in ui.GameObject)
        ob.SetActive(false);
    }

    foreach (var ui in _AllUI)
    {
      if (ui.Name == Name)
      {
        foreach (var ob in ui.GameObject)
          ob.SetActive(true);
      }
    }
  }
}
