import { NextResponse } from "next/server";
import { fetchLiveAnchor } from "@/lib/chain";
import { ChainAnchor, FALLBACK_ANCHOR, timeToBlock } from "@/lib/blocktime";

type ChainInfoResponse = {
  source: "live" | "fallback";
  anchor: ChainAnchor;
};

// Public RPC infra is shared; avoid hammering it on every page load/refresh.
const CACHE_TTL_MS = 6000;
let cache: { body: ChainInfoResponse; expiresAt: number } | null = null;

/** Extrapolates the hardcoded fallback anchor forward to "now" instead of
 * serving an increasingly stale frozen snapshot when the chain is unreachable. */
function extrapolatedFallback(): ChainAnchor {
  const nowMs = Date.now();
  return {
    blockNumber: timeToBlock(new Date(nowMs), FALLBACK_ANCHOR),
    timestampMs: nowMs,
    blockTimeMs: FALLBACK_ANCHOR.blockTimeMs,
  };
}

export async function GET() {
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.body);
  }

  let body: ChainInfoResponse;
  try {
    body = { source: "live", anchor: await fetchLiveAnchor() };
  } catch {
    body = { source: "fallback", anchor: extrapolatedFallback() };
  }

  cache = { body, expiresAt: Date.now() + CACHE_TTL_MS };
  return NextResponse.json(body);
}
