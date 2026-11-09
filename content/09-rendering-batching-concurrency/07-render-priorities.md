---
title: "What are render priorities?"
tags: ["lanes", "priorities", "scheduler", "concurrent"]
difficulty: "hard"
---

## Short answer

Render priorities decide which pending updates React renders first. Internally they're represented as **lanes**: bits in a 31-bit mask, where lower bits mean higher priority. React assigns a lane to each update based on its source (discrete event, continuous event, default, transition, idle), always renders the highest-priority pending lanes next, and maps lanes to Scheduler priorities to decide when the work runs.

## Explanation

### Main lanes

| Lane | Typical source | Event priority | Time-sliced? |
|---|---|---|---|
| SyncLane | Click, keydown, input, `flushSync` | Discrete | No |
| InputContinuousLane | mousemove, scroll, pointermove, drag | Continuous | No |
| DefaultLane | setTimeout, network callbacks, initial `root.render` | Default | No |
| TransitionLanes (multiple) | `startTransition`, `useDeferredValue`, Actions | Default (Scheduler Normal) | Yes |
| RetryLanes | Re-rendering a Suspense boundary after data resolves | — | Yes |
| IdleLane | Lowest-priority work | Idle | Yes |
| OffscreenLane | Hidden `<Activity>`/offscreen content | — | Yes |

Event priority comes from the DOM event type (`getEventPriority`), and `requestUpdateLane` reads it when you call `setState`. Inside `startTransition`, the transition lane wins regardless of the event.

### How priorities are used

```text
root.pendingLanes = SyncLane | TransitionLane1
getNextLanes()   -> SyncLane (highest)
render + commit SyncLane
getNextLanes()   -> TransitionLane1
render (time-sliced) + commit
```

- If a higher-priority lane arrives during a lower-priority render, React interrupts and switches.
- Lanes that wait too long are marked **expired** and rendered synchronously to prevent starvation.
- Updates are kept in the hook's queue; when React skips a low-priority update, it later **rebases** it on top of processed higher-priority updates so the final state is correct.

Analogy: a hospital triage system. Patients are seen by severity, but someone who has waited long enough is moved to the front.

### Why bitmasks?

Sets of updates can be merged with `|`, tested with `&`, and the highest priority found with `lanes & -lanes`, all O(1) operations. Several transitions can occupy different lanes and be rendered independently or entangled.

## Example

```jsx
import { useState, useTransition, useDeferredValue } from "react";

export default function Priorities() {
  const [text, setText] = useState("");          // SyncLane (from onChange)
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const deferredText = useDeferredValue(text);   // re-renders later in a transition lane

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={() => startTransition(() => setPage((p) => p + 1))}>
        Next page {isPending && "…"}
      </button>
      <Preview text={deferredText} page={page} />
    </>
  );
}

function Preview({ text, page }) {
  return <p>Page {page}: {text}</p>;
}
```

## Common mistakes

- Thinking you can set numeric priorities on updates. The public API is binary: urgent (default) or transition/deferred.
- Confusing React lanes with Scheduler priority levels; React maps lanes to Scheduler priorities but they're separate systems.
- Assuming DefaultLane updates are interruptible. They render with the sync work loop.

## Follow-up questions

- **How does React know an update came from a click?** The root event listener sets the current update priority from the event type before dispatching to handlers.
- **What's lane entanglement?** Forcing lanes to render together, e.g. transitions that update the same `useTransition` or `useDeferredValue` state.
- **Can a transition be starved by constant typing?** No. Expiration eventually forces it to render synchronously.

## Quick recap

- Priorities are lanes: bitmask, lower bit = higher priority.
- Assigned from event type or `startTransition`.
- Highest pending lanes render first; others can be interrupted.
- Expiration prevents starvation; rebasing keeps state correct.
