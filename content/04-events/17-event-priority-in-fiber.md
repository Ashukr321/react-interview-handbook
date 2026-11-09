---
title: "Explain priority of events in React Fiber"
tags: ["fiber", "events", "lanes", "concurrent-rendering", "internals"]
difficulty: "hard"
---

## Short answer

React Fiber assigns every state update a priority, represented as a **lane**, based on what triggered it. When an update happens inside an event handler, React looks at the event type: **discrete** events (click, keydown, input) get the highest priority (`SyncLane`), **continuous** events (mousemove, scroll, wheel) get `InputContinuousLane`, ordinary updates (data fetches, timeouts) get `DefaultLane`, and updates wrapped in `startTransition` get low-priority `TransitionLanes`. Higher-priority work can interrupt lower-priority rendering so the UI stays responsive.

## Explanation

Think of a hospital emergency room. A cardiac arrest (a click or keypress) is seen immediately; a sprained ankle (a mouse move) is quick but can wait a moment; a routine check-up (a transition) is handled when doctors are free, and gets paused if an emergency arrives.

### The priority levels

| Event priority | Lane | Typical events / sources | Behaviour |
|---|---|---|---|
| Discrete | `SyncLane` | click, keydown, keyup, input, change, submit, focus, pointerdown/up | Rendered synchronously right after the handler, not interruptible |
| Continuous | `InputContinuousLane` | mousemove, pointermove, scroll, wheel, drag, touchmove | High priority, but consecutive events can be batched |
| Default | `DefaultLane` | `setTimeout`, fetch callbacks, updates outside events | Normal priority |
| Transition | `TransitionLane1..N` | `startTransition`, `useTransition`, `useDeferredValue` | Interruptible, can be abandoned if superseded |
| Idle | `IdleLane` | Offscreen/hidden work (e.g. hidden `Activity`) | Done last |

### How it flows

```text
native event at root
  -> getEventPriority(event.type)      e.g. "click" -> DiscreteEventPriority
  -> set current update priority
  -> run handlers; each setState gets requestUpdateLane() -> SyncLane
  -> scheduleUpdateOnFiber: mark lanes on fiber and root
  -> ensureRootIsScheduled: pick highest-priority pending lanes
  -> Sync: flush in a microtask right after the event
     Others: Scheduler task; work loop yields every ~5ms to check for urgent work
  -> if an urgent update arrives mid-transition, the transition render is
     thrown away and restarted after the urgent one commits
```

### Why lanes (bitmasks)

Lanes are bits in a 31-bit integer. React can cheaply group, merge and check sets of updates (`lanes & SyncLane`), batch updates with the same lane, and track which work is pending, suspended or expired. Lower-priority lanes that wait too long are marked **expired** and rendered synchronously to avoid starvation.

## Example

```jsx
import { useState, useTransition } from "react";

export default function CitySearch({ cities }) {
  const [query, setQuery] = useState("");          // urgent
  const [visible, setVisible] = useState(cities);  // non-urgent
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q); // discrete "input" event -> SyncLane: input stays snappy

    startTransition(() => {
      // TransitionLane: interruptible; superseded if user keeps typing
      setVisible(cities.filter((c) => c.toLowerCase().includes(q.toLowerCase())));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      <ul style={{ opacity: isPending ? 0.6 : 1 }}>
        {visible.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </>
  );
}
```

## Common mistakes

- Thinking React re-orders your handlers by priority. Handlers still run in propagation order; priority applies to the **rendering** of the resulting updates.
- Assuming a transition makes the computation itself faster. It only makes the render interruptible.
- Wrapping controlled input updates in `startTransition`; the input then lags. Keep the input state urgent.
- Claiming Fiber interrupts discrete (sync) renders. Sync lane renders are not time-sliced.

## Follow-up questions

- **What prevents low-priority work from starving?** Each lane gets an expiration time; once expired, React renders it synchronously.
- **How do continuous events differ from discrete?** Discrete events must not be merged (each click matters); continuous ones are frequent, so React can batch them and only the latest matters.
- **Where does `useDeferredValue` fit?** It schedules a re-render with the new value in a transition lane, while the urgent render uses the old value.

## Quick recap

- Every update gets a lane based on its source.
- Discrete > continuous > default > transition > idle.
- The scheduler yields so urgent lanes can interrupt transitions.
- Lanes are bitmasks enabling cheap batching and starvation protection.
