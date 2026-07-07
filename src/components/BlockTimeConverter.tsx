"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChainAnchor,
  DEFAULT_BLOCK_TIME_SECONDS,
  FALLBACK_ANCHOR,
  blockToTime,
  timeToBlock,
} from "@/lib/blocktime";

type AnchorState = {
  anchor: ChainAnchor;
  source: "live" | "fallback" | "loading";
};

const MIN_BLOCK_NUMBER = 0; // Bittensor genesis

function formatUtc(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function formatRelative(date: Date, now: Date): string {
  const diffMs = date.getTime() - now.getTime();
  const past = diffMs <= 0;
  const abs = Math.abs(diffMs);
  const units: [string, number][] = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
    ["second", 1000],
  ];
  for (const [name, ms] of units) {
    const value = Math.floor(abs / ms);
    if (value >= 1) {
      const plural = value === 1 ? name : `${name}s`;
      return past ? `${value} ${plural} ago` : `in ${value} ${plural}`;
    }
  }
  return "right now";
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function BlockTimeConverter() {
  const [state, setState] = useState<AnchorState>({
    anchor: FALLBACK_ANCHOR,
    source: "loading",
  });
  const [blockTimeInput, setBlockTimeInput] = useState(String(DEFAULT_BLOCK_TIME_SECONDS));
  const [now, setNow] = useState<Date>(() => new Date());
  const [blockInput, setBlockInput] = useState(String(FALLBACK_ANCHOR.blockNumber));
  const [timeInput, setTimeInput] = useState(() => toDatetimeLocalValue(new Date()));

  // Only seed blockInput from the live anchor once, so a manual Refresh
  // (or the initial fetch) doesn't clobber a value the user is experimenting with.
  const hasSeededBlockInput = useRef(false);
  // Lets a stale in-flight response (e.g. from double-clicking Refresh) be
  // ignored if a newer request has since resolved.
  const latestRequestId = useRef(0);

  const blockTimeSecondsInput = Number(blockTimeInput);
  const blockTimeSeconds =
    Number.isFinite(blockTimeSecondsInput) && blockTimeSecondsInput > 0
      ? blockTimeSecondsInput
      : DEFAULT_BLOCK_TIME_SECONDS;
  const anchor: ChainAnchor = { ...state.anchor, blockTimeMs: blockTimeSeconds * 1000 };

  const fetchAnchor = () => {
    const requestId = ++latestRequestId.current;
    fetch("/api/chain-info")
      .then((res) => res.json())
      .then((data: { source: "live" | "fallback"; anchor: ChainAnchor }) => {
        if (requestId !== latestRequestId.current) return;
        setState({ anchor: data.anchor, source: data.source });
        if (!hasSeededBlockInput.current) {
          setBlockInput(String(data.anchor.blockNumber));
          hasSeededBlockInput.current = true;
        }
      })
      .catch(() => {
        if (requestId !== latestRequestId.current) return;
        setState({ anchor: FALLBACK_ANCHOR, source: "fallback" });
      });
  };

  const handleRefresh = () => {
    setState((s) => ({ ...s, source: "loading" }));
    fetchAnchor();
  };

  useEffect(() => {
    fetchAnchor();
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const blockNumber = Number(blockInput);
  const blockResultDate =
    Number.isFinite(blockNumber) && blockInput.trim() !== "" && blockNumber >= MIN_BLOCK_NUMBER
      ? blockToTime(blockNumber, anchor)
      : null;
  const blockResultValid = blockResultDate && !Number.isNaN(blockResultDate.getTime());

  const parsedTime = timeInput ? new Date(timeInput) : null;
  const timeResultBlock =
    parsedTime && !Number.isNaN(parsedTime.getTime())
      ? timeToBlock(parsedTime, anchor)
      : null;

  return (
    <div className="w-full max-w-2xl flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-black/10 dark:border-white/15 p-4 bg-black/[.02] dark:bg-white/[.03]">
        <div className="text-sm">
          <div className="font-medium">
            Current block:{" "}
            <span className="tabular-nums">
              {state.anchor.blockNumber.toLocaleString()}
            </span>
          </div>
          <div className="text-black/60 dark:text-white/50">
            {formatUtc(new Date(state.anchor.timestampMs))}
            {" · "}
            {state.source === "loading"
              ? "loading…"
              : state.source === "live"
                ? "live from chain"
                : "offline fallback anchor"}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="text-sm font-medium rounded-full border border-black/[.1] dark:border-white/[.15] px-4 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.08] transition-colors self-start sm:self-auto"
        >
          Refresh
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Block number → date &amp; time</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
            className="rounded-lg border border-black/[.15] dark:border-white/[.2] bg-transparent px-3 py-2 text-base tabular-nums outline-none focus:border-black/40 dark:focus:border-white/40"
            placeholder="e.g. 8565339"
          />
        </label>
        {blockResultValid && blockResultDate && (
          <div className="rounded-lg bg-black/[.03] dark:bg-white/[.05] px-3 py-2 text-sm">
            <div>{formatUtc(blockResultDate)}</div>
            <div className="text-black/60 dark:text-white/50">
              {formatRelative(blockResultDate, now)}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Date &amp; time → block number</span>
          <input
            type="datetime-local"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="rounded-lg border border-black/[.15] dark:border-white/[.2] bg-transparent px-3 py-2 text-base outline-none focus:border-black/40 dark:focus:border-white/40"
          />
          <span className="text-xs text-black/50 dark:text-white/40">
            Interpreted in your browser&apos;s local timezone.
          </span>
        </label>
        {timeResultBlock !== null && (
          <div className="rounded-lg bg-black/[.03] dark:bg-white/[.05] px-3 py-2 text-sm tabular-nums">
            Block {timeResultBlock.toLocaleString()}
            <span className="text-black/60 dark:text-white/50">
              {" "}
              ({timeResultBlock >= state.anchor.blockNumber ? "+" : ""}
              {(timeResultBlock - state.anchor.blockNumber).toLocaleString()} from current)
            </span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-1 pt-2 border-t border-black/10 dark:border-white/10">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Block time used for estimates{" "}
            <span className="text-black/50 dark:text-white/40">(seconds/block)</span>
          </span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={blockTimeInput}
            onChange={(e) => setBlockTimeInput(e.target.value)}
            className="w-20 rounded-lg border border-black/[.15] dark:border-white/[.2] bg-transparent px-2 py-1 text-right tabular-nums outline-none focus:border-black/40 dark:focus:border-white/40"
          />
        </label>
        <p className="text-xs text-black/50 dark:text-white/40">
          Bittensor targets ~12s per block; the real average drifts with network
          conditions, so estimates far from the current block are approximate.
        </p>
      </section>
    </div>
  );
}
