---
title: "Does React always update the Real DOM after every state change?"
tags: ["virtual-dom", "re-render", "commit", "bailout"]
difficulty: "medium"
---

## Short answer

No. A state change schedules a render, but React only writes to the DOM when reconciliation finds an actual difference. If the new state is the same value (`Object.is`), React can skip rendering entirely. If components render but return equivalent output, the commit phase has nothing to apply. And several state changes are batched into a single render and commit.

## Explanation

There are several points where a state change can stop before touching the DOM:

```text
setState(value)
  1. Same value as current? (Object.is)  -> may skip render entirely
  2. Batched with other updates          -> one render for many setStates
  3. Render phase: bailouts (memo, same props ref) -> subtrees skipped
  4. Reconciliation: output identical?   -> no flags on host fibers
  5. Render interrupted / abandoned       -> never committed
  6. Commit: apply only flagged changes   -> minimal DOM writes
```

### Cases with no DOM update

| Situation | What happens |
|---|---|
| `setCount(count)` with the same value | Bailout; usually no render, at most one render with no commit of children |
| Component renders but output is the same | Render runs, DOM untouched |
| `memo` child with shallow-equal props | Child render skipped |
| Transition render superseded by a newer update | Work discarded, nothing committed |
| State only used in an effect or ref logic | Render happens, DOM unchanged |

### When the DOM is updated

Only fibers flagged during reconciliation are touched: a changed text node, a changed attribute, inserted/removed/moved nodes. Unchanged siblings are left alone.

Analogy: a proofreader who reads the whole page (render) but only marks the words that actually changed (commit).

## Example

```jsx
import { useState } from "react";

export default function Toggle() {
  const [on, setOn] = useState(false);
  const [clicks, setClicks] = useState(0);
  console.log("render");

  return (
    <>
      {/* Same value: React bails out, no DOM change */}
      <button onClick={() => setOn(false)}>Set off</button>

      {/* clicks isn't displayed: renders, but zero DOM mutations */}
      <button onClick={() => setClicks((c) => c + 1)}>Count silently</button>

      {/* Changes one text node only */}
      <button onClick={() => setOn((v) => !v)}>Flip</button>
      <p>Status: {on ? "ON" : "OFF"}</p>
    </>
  );
}
```

> **⚠️ Gotcha:** The same-value bailout is not a guarantee of zero renders. React may render the component once more before bailing out on its children, so don't rely on it to prevent render-phase side effects.

## Common mistakes

- Equating "component rendered" with "DOM changed". Profiler renders and DOM mutations are different things.
- Mutating state objects in place, then calling the setter with the same reference: React bails out and the UI never updates.
- Assuming 3 `setState` calls cause 3 DOM updates. With automatic batching they produce one.

## Follow-up questions

- **How can I check whether the DOM changed?** In Chrome DevTools, the Elements panel flashes changed nodes; Rendering → "Paint flashing" shows repaints.
- **Is an empty commit expensive?** Very cheap; the commit walks only fibers with `subtreeFlags`.
- **Does `useRef` mutation cause DOM updates?** No, refs don't schedule renders at all.

## Quick recap

- State change ≠ DOM update.
- Same-value updates can be skipped.
- Renders with identical output commit nothing.
- Only flagged fibers are written to the DOM, once per batch.
