---
title: "Two sibling components update at different priorities. How does Fiber handle this?"
tags: ["fiber", "lanes", "concurrent-rendering", "starttransition", "internals"]
difficulty: "hard"
---

## Short answer

Every update is assigned a **lane** (priority): a click or keystroke gets a high-priority sync/input lane, while a `startTransition` update gets a lower transition lane. React renders the highest-priority lanes first. In that pass, the sibling with only low-priority work is skipped, and its pending update stays queued. Afterwards React renders the transition lane in interruptible chunks. If another urgent update arrives mid-way, React pauses or throws away the in-progress transition work and restarts it later.

## Why it happens

Think of an emergency room: a critical patient (typing) is seen immediately, and routine check-ups (filtering a big table) wait, and can be paused when another emergency walks in.

```text
Click in <SearchInput>   → SyncLane / InputContinuousLane
startTransition(() => setFilter(...)) in <ResultsTable> → TransitionLane

Render pass 1 (lanes = Sync)
  <SearchInput>   process Sync update ─► render
  <ResultsTable>  has only Transition update ─► skipped this pass
  commit ─► input updated immediately

Render pass 2 (lanes = Transition), interruptible
  <ResultsTable>  render rows... yield every ~5ms...
     ⚡ new keystroke arrives → abandon work-in-progress, handle Sync first
  restart Transition later ─► commit when complete
```

Key internals:

- **Lanes** are a bitmask on each Fiber (`lanes`, `childLanes`), so React can tell whether a subtree has work at the current priority.
- **Work-in-progress tree**: concurrent renders build an alternate Fiber tree off-screen. Nothing is committed until it's complete, so users never see a half-rendered UI.
- **Time slicing**: transition renders yield to the browser about every 5 ms so input and paint can happen.
- **Commit is always synchronous**: only the render phase is interruptible.

## How to fix it

You "use" this behavior by marking non-urgent updates explicitly:

```jsx
import { useState, useTransition } from "react";

export default function SearchPage({ allRows }) {
  const [text, setText] = useState("");       // urgent
  const [filter, setFilter] = useState("");   // non-urgent
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    setText(e.target.value);                      // high-priority lane
    startTransition(() => setFilter(e.target.value)); // transition lane
  }

  return (
    <>
      <input value={text} onChange={handleChange} />
      {isPending && <span>Updating…</span>}
      <ResultsTable rows={allRows} filter={filter} />
    </>
  );
}
```

> **⚠️ Gotcha:** Interruption only helps between component boundaries. A single component doing 500 ms of synchronous work still blocks; split it, memoize it, or move it to a worker.

## How to verify

- React DevTools Profiler (or the React Performance Tracks in Chrome's Performance panel, React 19.2+) shows separate commits for the urgent and transition updates.
- The Performance panel shows the transition render split into short tasks instead of one long task.
- Typing quickly should never lag, even with 6x CPU throttling.

## Follow-up questions

- **Can a component show inconsistent state across siblings?** No. A commit applies one consistent set of lanes, which prevents tearing for React state; use `useSyncExternalStore` for external stores.
- **What happens to effects of an abandoned render?** They never run, because only committed work runs effects. That's why render must be pure.
- **Is the order of lanes configurable?** No. React assigns lanes from the update's context (event type, transition, etc.).

## Quick recap

- Updates get lanes; higher lanes render first.
- Siblings with only low-priority work are skipped in urgent passes.
- Transition renders are time-sliced and interruptible.
- Commit is atomic and synchronous.
