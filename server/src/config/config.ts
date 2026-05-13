export const BET_AMOUNT    = 100;
export const STARTING_CHIPS = 10_000;

export const TURN_TIMEOUT_MS      = 30_000;   // 30s — auto-stand if player idles
export const ROOM_IDLE_TIMEOUT_MS = 300_000;  // 5min — close room if no game starts
export const RECONNECT_TIMEOUT_MS = 30_000;   // 30s — grace period before kick on disconnect