---
title: "How React optimizes rendering with batching & concurrency features"
tags: ["batching", "concurrent-rendering", "useTransition", "useDeferredValue", "suspense"]
difficulty: "hard"
---

## Short answer

**Automatic batching** (React 18+) groups multiple state updates from the same tick, in event handlers, promises, timeouts or native listeners, into a single re-render. **Concurrent rendering** makes rendering interruptible: React can prepare an update in the background, pause it to handle urgent input, and throw away stale work. You opt in with `useTransition`/`startTransition` and `useDeferredValue` to mark updates as non-urgent, and `Suspense` lets React show fallbacks and stream or selectively hydrate parts of the page.

## Explanation

Batching is like a waiter collecting the whole table's order before going to the kitchen, instead of one trip per dish. Concurrency is like a chef who can pause a slow-cooking dish to plate an urgent order and then resume.

### Automatic batching

| Where updates happen | React 17 | React 18+ |
|---|---|---|
| React event handlers | Batched | Batched |
| `setTimeout`, promises, `fetch().then` | One render per update | Batched |
| Native event listeners | One render per update | Batched |

Use `flushSync` from `react-dom` in the rare case you need the DOM updated immediately (for example, to measure before scrolling).

### Concurrent features

```text
User types "r" -> urgent update (input value)       -> render immediately
              -> transition update (filter 10k rows) -> render in background, yielding every ~5ms
User types "re" before it finishes -> React discards the stale "r" render, starts "re"
```

| API | Purpose |
|---|---|
| `useTransition` | Marks a state update as non-urgent; gives `isPending` for spinners. In React 19 it also accepts async functions (Actions) |
| `startTransition` | Same, without the pending flag (usable outside components) |
| `useDeferredValue` | Gives a lagging copy of a value; heavy children render with the old value until React has time |
| `Suspense` | Shows a fallback while code or data loads; enables streaming SSR and selective hydration |
| `useOptimistic` (React 19) | Shows an optimistic value while an action is pending |

Concurrency does not make code faster. It keeps the UI **responsive** by prioritizing urgent updates and avoiding blocking the main thread for long renders.

## Example

```jsx
import { useState, useTransition, useDeferredValue, memo } from "react";

const allItems = Array.from({ length: 20_000 }, (_, i) => `Item ${i}`);

const SlowList = memo(function SlowList({ query }) {
  const filtered = allItems.filter((i) => i.includes(query));
  return <ul>{filtered.slice(0, 500).map((i) => <li key={i}>{i}</li>)}</ul>;
});

export function Search() {
  const [text, setText] = useState("");
  const deferredText = useDeferredValue(text); // list lags behind typing, input never does
  const isStale = text !== deferredText;

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        <SlowList query={deferredText} />
      </div>
    </>
  );
}

export function Tabs() {
  const [tab, setTab] = useState("home");
  const [isPending, startTransition] = useTransition();

  function selectTab(next) {
    startTransition(() => setTab(next)); // heavy tab render will not block clicks
  }

  return (
    <>
      <button onClick={() => selectTab("home")}>Home</button>
      <button onClick={() => selectTab("reports")}>Reports</button>
      {isPending && <span>Loading...</span>}
      <p>Current: {tab}</p>
    </>
  );
}

// Batching: one render, not three
function handleSave() {
  fetch("/api/save").then(() => {
    setSaving(false);
    setSaved(true);
    setMessage("Saved");
  });
}
```

> **💡 Interview tip:** `SlowList` must be memoized for `useDeferredValue` to help; otherwise it re-renders with every keystroke anyway because its parent re-rendered.

## Common mistakes

- Wrapping a controlled input's own `setValue` in `startTransition`; the input then lags. Keep the input urgent and defer the expensive part.
- Expecting transitions to speed up an algorithm; they only reschedule rendering.
- Assuming `setState` followed by reading the DOM sees the change; use `flushSync` only if really needed.
- Using `useDeferredValue` without memoizing the expensive child.

## Follow-up questions

- **Do you need createRoot for these features?** Yes. Automatic batching and concurrent features require `createRoot` (the legacy `ReactDOM.render` was removed in React 19).
- **What is selective hydration?** With streaming SSR and `Suspense`, React hydrates sections independently and prioritizes the one the user interacts with.
- **useTransition vs debounce?** Debounce delays work by a fixed time; transitions start immediately and are interrupted only if something urgent arrives, adapting to device speed.

## Quick recap

- React 18+ batches all updates in the same tick into one render.
- Concurrent rendering is interruptible and prioritized.
- `useTransition` and `useDeferredValue` mark work as non-urgent.
- `Suspense` enables fallbacks, streaming and selective hydration.
