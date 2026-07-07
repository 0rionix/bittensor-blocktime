export interface ChainAnchor {
  /** A known block number */
  blockNumber: number;
  /** That block's timestamp, in milliseconds since the Unix epoch */
  timestampMs: number;
  /** Average milliseconds per block used to extrapolate away from the anchor */
  blockTimeMs: number;
}

export const DEFAULT_BLOCK_TIME_SECONDS = 12;

/**
 * Live-fetched at implementation time from the public Bittensor (Finney) RPC
 * endpoint. Used only if the live lookup in /api/chain-info fails, so the app
 * still works (with a note) when offline or if the endpoint is unreachable.
 */
export const FALLBACK_ANCHOR: ChainAnchor = {
  blockNumber: 8565339,
  timestampMs: 1783379688001,
  blockTimeMs: DEFAULT_BLOCK_TIME_SECONDS * 1000,
};

export function blockToTime(blockNumber: number, anchor: ChainAnchor): Date {
  const deltaBlocks = blockNumber - anchor.blockNumber;
  return new Date(anchor.timestampMs + deltaBlocks * anchor.blockTimeMs);
}

export function timeToBlock(date: Date, anchor: ChainAnchor): number {
  const deltaMs = date.getTime() - anchor.timestampMs;
  return Math.round(anchor.blockNumber + deltaMs / anchor.blockTimeMs);
}
