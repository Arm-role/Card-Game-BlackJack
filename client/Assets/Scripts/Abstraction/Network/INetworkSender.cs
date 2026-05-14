public interface INetworkSender
{
    void RequestLogin(string username, string password);
    void RequestRegister(string username, string password);
    void RequestCreateRoom(int minChip, int betAmount);
    void RequestJoinRoom(int roomId);
    void RequestQuickJoinRoom();
    void RequestLeaveRoom();
    void RequestSwapSeat(int fromSeat, int toSeat);
    void RequestSwapResponse(bool accept);
    void RequestStartGame();
    void RequestPlayerReady();
    void RequestHit();
    void RequestStand();
    void RequestClaimChip();
}
