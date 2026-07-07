# bittensor-blocktime

A tiny Next.js app that converts between Bittensor (Finney mainnet) block
numbers and estimated UTC timestamps, in both directions.

- Fetches the current block number + on-chain timestamp live from the public
  Finney JSON-RPC entrypoint (`/api/chain-info`), falling back to a hardcoded
  anchor if the chain is unreachable.
- Extrapolates from that anchor using an editable blocks/seconds rate
  (defaults to Bittensor's ~12s target, since the real average drifts with
  network conditions).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
