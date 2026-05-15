export const BET_AMOUNT    = 5 * 1000;
export const STARTING_CHIPS = 10 * 1000;
export const CLAIM_CHIP_AMOUNT = 10 * 1000;

export const TURN_TIMEOUT_MS      = 30 * 1000;   // 30s — auto-stand if player idles
export const ROOM_IDLE_TIMEOUT_MS = 300 * 1000;  // 5min — close room if no game starts
export const RECONNECT_TIMEOUT_MS = 30 * 1000;   // 30s — grace period before kick on disconnect