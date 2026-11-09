---
title: "What is automatic batching in React 18?"
tags: ["batching", "react-18", "createRoot"]
difficulty: "medium"
---

## Short answer

Automatic batching is React 18's behavior where all state updates are batched regardless of where they originate: React event handlers, `setTimeout`, promise callbacks, `fetch().then`, async functions and native `addEventListener` handlers. It's enabled when you render with `createRoot`. Previously, only updates inside React event handlers were batched. You can opt out for a specific update with `flushSync`.

## Explanation

### How it works internally

With `createRoot`, every update goes through the same path: it gets a lane, is queued, and `ensureRootIsScheduled` schedules one render for the root. Updates arriving before that render starts simply join it. SyncLane work is flushed in a microtask, so all synchronous updates in the same task are combined; other lanes are combined in a single Scheduler task.

In legacy mode, React relied on an `isBatchingUpdates`-style flag set only while React was dispatching its own synthetic events. Code running later (a timeout, a resolved promise) ran outside that flag, so each `setState` rendered synchronously.

```text
React 18 (createRoot):
  await fetch() -> setData(d); setLoading(false)  => 1 render

React 17 / legacy ReactDOM.render:
  await fetch() -> setData(d)        => render #1
                   setLoading(false) => render #2
```

### Enabling it

| Root API | Automatic batching |
|---|---|
| `ReactDOM.render` (legacy, removed in React 19) | No |
| `createRoot(container).render(<App />)` | Yes |
| `hydrateRoot(container, <App />)` | Yes |
| Next.js App Router, Remix, Vite templates | Yes (they use `createRoot`/`hydrateRoot`) |

## Example

```jsx
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

function Loader() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  console.log("render", { loading, hasData: !!data });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/items");
    const json = await res.json();
    // After an await: still batched in React 18 -> one render
    setData(json);
    setLoading(false);
  };

  const scrollAfterAdd = () => {
    // Opt out: commit now so the DOM is up to date before measuring
    flushSync(() => setData((d) => [...(d ?? []), { id: Date.now() }]));
    window.scrollTo(0, document.body.scrollHeight);
  };

  return (
    <>
      <button onClick={load}>Load</button>
      <button onClick={scrollAfterAdd}>Add & scroll</button>
      {loading ? <p>Loading…</p> : <pre>{JSON.stringify(data)}</pre>}
    </>
  );
}

createRoot(document.getElementById("root")).render(<Loader />);
```

## Common mistakes

- Upgrading the `react` package to 18 but keeping `ReactDOM.render`. You get legacy behavior (and a warning) without automatic batching.
- Relying on the DOM being updated right after `setState` in a timeout, which worked by accident in React 17. Use `flushSync` or an effect.
- Overusing `flushSync`; it forces synchronous rendering and can hurt performance.

> **💡 Interview tip:** Mention that `unstable_batchedUpdates` is no longer needed with `createRoot`; it still exists but is effectively a no-op wrapper.

## Follow-up questions

- **Are updates in different `await` steps batched together?** No. Each continuation after an `await` is a separate task, so each gets its own batch.
- **Does automatic batching affect class components?** Yes. `this.setState` in timeouts is batched too, so `this.state` isn't updated synchronously anymore.
- **Is a transition update batched with an urgent one?** They're queued in the same tick but in different lanes, so React renders the urgent lane first and the transition separately.

## Quick recap

- React 18 batches updates from any source.
- Requires `createRoot` / `hydrateRoot`.
- One render and commit per tick per lane.
- `flushSync` is the escape hatch.
