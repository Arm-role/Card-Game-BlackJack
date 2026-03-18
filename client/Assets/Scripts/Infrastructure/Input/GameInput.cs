using System;
using UnityEngine;
using UnityEngine.InputSystem;

public class GameInput : MonoBehaviour, IGameInput
{
  private PlayerInputActions _input;

  public static GameInput Instance { get; private set; }

  private void Awake()
  {
    Instance = this;
    _input = new PlayerInputActions();
  }

  private void OnEnable()
  {
    _input.Enable();

    _input.Gameplay.TestA.performed += OnTestA;
    _input.Gameplay.TestB.performed += OnTestB;
  }


  private void OnDisable()
  {
    _input.Gameplay.TestA.performed -= OnTestA;
    _input.Gameplay.TestB.performed -= OnTestB;

    _input.Disable();
  }

  public event Action OnInputTastA;
  public event Action OnInputTastB;

  private void OnTestA(InputAction.CallbackContext ctx)
  {
    OnInputTastA?.Invoke();
  }

  private void OnTestB(InputAction.CallbackContext ctx)
  {
    OnInputTastB?.Invoke();
  }
}