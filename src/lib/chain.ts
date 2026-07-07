import { ChainAnchor, DEFAULT_BLOCK_TIME_SECONDS } from "@/lib/blocktime";

// Public Substrate JSON-RPC entrypoints for the Bittensor "Finney" mainnet.
// Raced concurrently; the first to answer wins.
const RPC_ENDPOINTS = [
  "https://entrypoint-finney.opentensor.ai:443",
  "https://lite.chain.opentensor.ai:443",
];

// storage key = twox128("Timestamp") ++ twox128("Now"), the standard
// pallet_timestamp "Now" key shared by all Substrate chains.
const TIMESTAMP_NOW_KEY =
  "0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb";

async function rpcCall(
  endpoint: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`RPC ${method} error: ${json.error.message}`);
    return json.result;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeU64LittleEndianHex(hex: string): number {
  return Number(Buffer.from(hex.replace(/^0x/, ""), "hex").readBigUInt64LE(0));
}

async function fetchAnchorFrom(endpoint: string): Promise<ChainAnchor> {
  const [header, storage] = await Promise.all([
    rpcCall(endpoint, "chain_getHeader", []),
    rpcCall(endpoint, "state_getStorage", [TIMESTAMP_NOW_KEY]),
  ]);
  const blockNumberHex = (header as { number?: unknown } | null)?.number;
  if (typeof blockNumberHex !== "string" || typeof storage !== "string") {
    throw new Error(`Unexpected RPC response shape from ${endpoint}`);
  }
  return {
    blockNumber: Number(BigInt(blockNumberHex)),
    timestampMs: decodeU64LittleEndianHex(storage),
    blockTimeMs: DEFAULT_BLOCK_TIME_SECONDS * 1000,
  };
}

/** Fetches the current block number + timestamp straight from the chain. */
export async function fetchLiveAnchor(): Promise<ChainAnchor> {
  try {
    return await Promise.any(RPC_ENDPOINTS.map(fetchAnchorFrom));
  } catch {
    throw new Error("All RPC endpoints failed");
  }
}
