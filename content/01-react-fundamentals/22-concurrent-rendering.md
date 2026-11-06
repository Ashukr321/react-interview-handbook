---
title: "How does React's concurrent rendering improve performance?"
tags: ["concurrent", "useTransition", "useDeferredValue", "performance"]
difficulty: "hard"
---

## Short answer

Concurrent rendering lets React prepare multiple versions of the UI and **interrupt** a long render to handle something more urgent, like a keystroke. Rendering is split into small units of work that yield to the browser, and updates are prioritised: urgent ones (typing, clicking) run first, while non-urgent ones marked with `startTransition` or `useDeferredValue` run in the background and can be abandoned if outdated. It improves **perceived** responsiveness rather than making work faster.

## Explanation

Old React was a single-lane road: once a big truck (a heavy render) entered, every car behind it waited. Concurrent React adds an express lane: ambulances (user input) can overtake, and the truck pulls over until the road is clear.

```text
 Synchronous (blocking):
 [ keystroke ][======== render 10,000 rows ========][ next keystroke waits ]

 Concurrent:
 [ keystroke ][ render chunk ][ keystroke! ][ restart with latest value ][ chunk ][ commit ]
```

### Key building blocks

| Feature | What it does |
|---------|--------------|
| `createRoot` | Opts the app into concurrent features (React 18+) |
| `startTransition` / `useTransition` | Marks a state update as non-urgent; gives `isPending` |
| `useDeferredValue` | Gives a "lagging" copy of a value that updates at low priority |
| Suspense | Shows fallback for one part while the rest stays interactive; keeps old UI during transitions |
| Automatic batching | Groups updates from any source into one render |
| Selective hydration | Hydrates the part the user interacts with first |

### What it does not do

It does not make a slow component faster. Total work is similar or larger; the benefit is that urgent updates never wait behind it. Render must stay pure, because React may render a component, discard the result and render again.

## Example

```jsx
import { useDeferredValue, useMemo, useState, useTransition, memo } from "react";

const SlowList = memo(function SlowList({ query }) {
  const items = useMemo(() => {
    const result = [];
    for (let i = 0; i < 20000; i++) {
      if (`Item ${i}`.includes(query)) result.push(`Item ${i}`);
    }
    return result;
  }, [query]);

  return <ul>{items.slice(0, 200).map((t) => <li key={t}>{t}</li>)}</ul>;
});

export default function Search() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query); // lags behind during typing
  const isStale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <SlowList query={deferredQuery} />
      </div>
    </>
  );
}

// Same idea with an explicit transition
function Tabs() {
  const [tab, setTab] = useState("home");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button onClick={() => startTransition(() => setTab("reports"))}>
        Reports {isPending && "(loading...)"}
      </button>
      <p>Current tab: {tab}</p>
    </>
  );
}
```

## Common mistakes

- Wrapping a controlled input's own state update in `startTransition`; the input will feel laggy. Keep input state urgent and defer the expensive consumer.
- Expecting concurrency to fix genuinely slow algorithms. Optimise or virtualise too.
- Side effects in render, which can run multiple times when React restarts work.
- Forgetting `memo` on the slow child, so it re-renders with the urgent value anyway.

## Follow-up questions

- **`useTransition` vs `useDeferredValue`?** Use `useTransition` when you own the state update; use `useDeferredValue` when you only receive a value (e.g. a prop).
- **Is concurrent mode opt-in?** There is no separate mode; using `createRoot` enables concurrent features, but they only activate when you use transitions, deferred values or Suspense.
- **What changed in React 19?** Transitions accept async functions (Actions), and `useDeferredValue` accepts an initial value.

## Quick recap

- Rendering is interruptible and prioritised.
- Urgent input first; transitions and deferred values in the background.
- Improves responsiveness, not raw speed.
- Keep render pure because work may be restarted.
