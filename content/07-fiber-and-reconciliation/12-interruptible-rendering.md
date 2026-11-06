---
title: "What is interruptible rendering?"
tags: ["fiber", "concurrent", "render-phase"]
difficulty: "medium"
---

## Short answer

Interruptible rendering means React can stop building a new UI tree partway through, let something more important run, and then resume or start over, without the user ever seeing a half-rendered screen. Fiber makes it possible because the render phase only builds a private `workInProgress` tree; the visible `current` tree and the DOM are untouched until a synchronous commit.

## Explanation

### Why Fiber can interrupt safely

React keeps two fiber trees (double buffering):

```text
          root.current
               |
   current tree  <--alternate-->  workInProgress tree
   (on screen)                    (being built, private)

interrupt  -> WIP may be thrown away, current still valid
complete   -> commit applies flags, root.current = WIP
```

Because the WIP tree is like an off-screen buffer in a game engine, React can:

- **Yield**: pause after any fiber and continue later from the same spot.
- **Abort**: discard the WIP tree when a higher-priority update arrives.
- **Restart**: begin again from the root with fresh state.
- **Rebase**: re-apply low-priority updates on top of an urgent one so the final state is consistent.

### What is and isn't interruptible

| Work | Interruptible? |
|---|---|
| Render phase for Transition / Retry / Idle lanes | Yes |
| Render phase for Sync / InputContinuous / Default lanes | No (sync work loop) |
| Commit phase (DOM mutations, layout effects) | Never |
| Inside a single component function | No, React yields only between fibers |

### Implications for your code

Because render work can be discarded or repeated:

- The component body must be pure. Logging, subscriptions or mutations there can run for renders that never commit.
- Values read during render must be consistent. External mutable stores need `useSyncExternalStore` to avoid "tearing" (different components showing different snapshots in one render).
- StrictMode double-invokes render in development to surface impure code.

## Example

```jsx
import { useState, useSyncExternalStore, startTransition } from "react";
import { store } from "./store";

export default function Dashboard() {
  // Safe under interruptible rendering: React detects store changes mid-render
  const theme = useSyncExternalStore(store.subscribe, store.getTheme);
  const [range, setRange] = useState("7d");

  return (
    <>
      <select
        value={range}
        onChange={(e) => startTransition(() => setRange(e.target.value))}
      >
        <option value="7d">7 days</option>
        <option value="90d">90 days</option>
      </select>
      <Charts range={range} theme={theme} />
    </>
  );
}
```

## Common mistakes

- Saying interruptible rendering means "React stops updating the DOM halfway". The DOM is never partially updated.
- Assuming an interrupted render's work is always reused. Often it is thrown away and redone.
- Reading a mutable global (e.g. `window.store.value`) during render, leading to tearing in concurrent renders.

> **💡 Interview tip:** Tie it to the two trees: "interruption is safe because React only mutates a private workInProgress tree until commit."

## Follow-up questions

- **What happens to effects from an abandoned render?** They never run; effects are only executed for committed trees.
- **How does React avoid starving low-priority work?** Lanes that wait too long are marked expired and rendered synchronously.
- **Is this the same as concurrent rendering?** Interruptible rendering is the mechanism; concurrent rendering is the broader model built on it.

## Quick recap

- Render can pause, abort or restart; commit cannot.
- Safe because WIP tree is private until commit.
- Only non-blocking lanes are interrupted.
- Requires pure render and tear-free store reads.
