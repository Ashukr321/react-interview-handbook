---
title: "How do you handle real-time updates in a React application efficiently?"
tags: ["websockets", "real-time", "sse", "performance"]
difficulty: "hard"
---

## Short answer

I choose the transport by need (WebSockets for two-way, Server-Sent Events for server-to-client, polling for low frequency), keep one shared connection rather than one per component, and push updates into a normalized cache or store so only the components subscribed to changed data re-render. For high-frequency streams I batch or throttle updates, and I handle reconnects, missed messages and cleanup on unmount.

## Why it happens

Real-time UIs go wrong in a few typical ways:

- **One socket per component**, multiplying connections and duplicate messages.
- **Every message triggers `setState`** at the top of the tree, re-rendering everything (100 price ticks per second = 100 full renders).
- **Arrays instead of maps**, so updating one item means copying and re-rendering a whole list.
- **No reconnect logic**, so the UI silently goes stale after a network blip.
- **Missing cleanup**, leaking listeners on every remount.

## How to fix it

### 1. Pick the transport

| Option | Direction | Good for |
| --- | --- | --- |
| Polling / TanStack Query `refetchInterval` | Client pulls | Dashboards updating every 30 s |
| Server-Sent Events | Server -> client | Notifications, feeds, AI streaming |
| WebSocket | Both ways | Chat, collaboration, trading |

### 2. One connection, store-based fan-out

```jsx
// store.js – Zustand keeps prices keyed by symbol
import { create } from "zustand";
export const usePrices = create(() => ({ bySymbol: {} }));

let buffer = {};
export function connect() {
  const ws = new WebSocket("wss://example.com/prices");
  ws.onmessage = (e) => {
    const { symbol, price } = JSON.parse(e.data);
    buffer[symbol] = price; // collect, do not render yet
  };
  const flush = setInterval(() => {
    if (Object.keys(buffer).length === 0) return;
    usePrices.setState((s) => ({ bySymbol: { ...s.bySymbol, ...buffer } }));
    buffer = {};
  }, 100); // at most 10 renders per second
  return () => { clearInterval(flush); ws.close(); };
}
```

```jsx
function PriceCell({ symbol }) {
  // selector: re-renders only when THIS symbol changes
  const price = usePrices((s) => s.bySymbol[symbol]);
  return <td>{price?.toFixed(2)}</td>;
}

function App() {
  useEffect(() => connect(), []);
  return <PriceTable />;
}
```

### 3. Integrate with server state

With TanStack Query, update the cache on events: `queryClient.setQueryData(["order", id], updated)` or `invalidateQueries` for less frequent changes.

### 4. Handle the network

- Reconnect with exponential backoff and jitter.
- On reconnect, resync (fetch a snapshot or request messages since the last ID).
- Heartbeats to detect dead connections; pause or slow down when `document.hidden`.

> **⚠️ Gotcha:** Combining Context with a fast-changing value re-renders every consumer. Use a store with selectors (`useSyncExternalStore` under the hood) instead.

## How to verify

- React Profiler: only the changed rows render per update.
- Kill the network in DevTools and restore it; the UI reconnects and catches up.
- Check there is exactly one open socket in the Network -> WS tab.

## Follow-up questions

- **Why batch updates?** Humans cannot see 100 changes a second; batching to animation frames or 100 ms saves most render work.
- **SSE vs WebSocket?** SSE is simpler, auto-reconnects and works over HTTP, but is one-way.
- **How do you handle message ordering?** Use sequence numbers or timestamps and ignore stale messages.

## Quick recap

- Pick polling, SSE or WebSocket by direction and frequency.
- One shared connection feeding a normalized store.
- Selectors so only affected components re-render; batch high-frequency updates.
- Reconnect, resync and clean up.
