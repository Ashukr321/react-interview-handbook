---
title: "What is startTransition?"
tags: ["concurrent", "transitions", "react-18", "performance"]
difficulty: "medium"
---

## Short answer

`startTransition` is a React API that marks the state updates inside its callback as **non-urgent** (transition) updates. React renders them at a lower priority and can interrupt or abandon that render if something more urgent, like a keystroke, comes in. It is imported directly from `react` and is the hook-free sibling of `useTransition`.

## Explanation

Before React 18, every `setState` was treated the same: once React started rendering, it finished, even if that took 200 ms and the user was typing. `startTransition` lets you tell React "this update can wait".

Think of a restaurant kitchen. A customer asking for water (urgent) gets served immediately, even if the chef is halfway through plating a five-course meal (transition). The meal is not cancelled, it just yields.

### What happens inside

- Updates inside the callback get a **transition lane** instead of a sync/default lane.
- React renders them with time slicing, checking every ~5 ms whether it should yield to the browser.
- If a new urgent update arrives, React throws away the in-progress transition render, handles the urgent update, then restarts the transition with the latest state.
- If the transition causes a component to suspend, React keeps showing the **old UI** instead of a Suspense fallback.

### Where you can use it

| Situation | Use |
|---|---|
| Inside a component and you need a pending flag | `useTransition` |
| Outside components (router, store, utility code) | `startTransition` |
| Inside a component, no pending flag needed | either works |

In React 19 the callback can be `async`, which turns it into an **Action**. Note that state updates after an `await` must be wrapped in another `startTransition` to stay marked as a transition.

## Example

```jsx
import { useState, startTransition } from "react";

function ProductSearch({ products }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");

  function handleChange(e) {
    setQuery(e.target.value); // urgent: the input must stay responsive
    startTransition(() => {
      setFilter(e.target.value); // non-urgent: the big list can lag behind
    });
  }

  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <input value={query} onChange={handleChange} />
      <ul>
        {visible.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </>
  );
}
```

## Common mistakes

- Wrapping the controlled input's own `setState` in a transition. The input then lags, because its value update is now low priority.
- Expecting it to delay or debounce work. It starts immediately; it only changes priority and interruptibility.
- Passing a callback that does a `setTimeout` and sets state inside it. Only updates scheduled synchronously during the callback (or right after an `await` in React 19 if re-wrapped) are marked.
- Assuming it makes slow code faster. The total work is the same; only responsiveness improves.

## Follow-up questions

- **How is it different from `useTransition`?** `useTransition` returns `[isPending, startTransition]`, so you can show a pending indicator; the standalone function gives no pending state.
- **Does it work with the legacy `ReactDOM.render`?** No. Concurrent features only activate under `createRoot` / `hydrateRoot`.
- **Can a transition be interrupted by another transition?** Yes. Newer transitions supersede older ones; React renders only the latest state.

## Quick recap

- Marks updates as low-priority, interruptible transitions.
- Keeps urgent updates (typing, clicking) responsive.
- Suspending inside a transition keeps the old UI instead of a fallback.
- Use `useTransition` when you need `isPending`.
- React 19 allows async callbacks (Actions).
