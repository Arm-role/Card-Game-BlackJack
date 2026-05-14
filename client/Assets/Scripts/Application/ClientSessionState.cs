using UnityEngine;

public class ClientSessionState
{
    public ClientGameState Current { get; private set; } = ClientGameState.Disconnected;

    public void ToAuthenticated() => Transition(ClientGameState.Authenticated);
    public void ToInRoom()        => Transition(ClientGameState.InRoom);
    public void ToDealing()       => Transition(ClientGameState.Dealing);
    public void ToWaitingTurn()   => Transition(ClientGameState.WaitingTurn);
    public void ToMyTurn()        => Transition(ClientGameState.MyTurn);
    public void ToGameOver()      => Transition(ClientGameState.GameOver);

    private void Transition(ClientGameState next)
    {
        Debug.Log($"[FSM] {Current} → {next}");
        Current = next;
    }
}
