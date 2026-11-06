---
title: "What are urgent updates?"
tags: ["concurrent", "priority", "lanes", "react-18"]
difficulty: "easy"
---

## Short answer

Urgent updates are state changes that give direct feedback to a user's action, such as typing, clicking or pressing a key. React schedules them in high-priority lanes and renders them synchronously (non-interruptibly), so the screen reflects the interaction immediately. Every update not wrapped in a transition or deferred is treated as urgent by default.

## Explanation

Our brains notice lag in direct manipulation almost instantly. A keypress that takes 150 ms to appear feels broken, while a search result appearing 150 ms later feels fine. React 18 uses that insight.

Analogy: a call-center agent answers the phone immediately (urgent), and then says "let me look that up" for the slower task (transition).

### What counts as urgent

| Source | Priority (lane) |
|---|---|
| Discrete events: `click`, `keydown`, `input`, `submit` | `SyncLane` (highest) |
| Continuous events: `mousemove`, `scroll`, `pointermove` | `InputContinuousLane` |
| Updates outside events: `setTimeout`, fetch callbacks, effects | `DefaultLane` |
| `flushSync(() => ...)` | Forced synchronous |

Technically "urgent" is a user-facing term. Internally, sync, input-continuous and default lanes all render without yielding, while transition lanes use time slicing.

### Why the split matters

When an urgent update arrives during a transition render, React pauses the transition, renders and commits the urgent update, then resumes or restarts the transition. Without this split (React 17 and earlier), one slow render blocked everything.

## Example

```jsx
import { useState, useTransition } from "react";

function ColorPicker({ swatches }) {
  const [hex, setHex] = useState("#000000"); // urgent
  const [preview, setPreview] = useState("#000000"); // transition
  const [, startTransition] = useTransition();

  return (
    <>
      <input
        value={hex}
        onChange={(e) => {
          setHex(e.target.value); // urgent: what the user typed
          startTransition(() => setPreview(e.target.value)); // can wait
        }}
      />
      <HeavyPalette base={preview} swatches={swatches} />
    </>
  );
}
```

## Common mistakes

- Assuming urgent updates are "faster code". They are higher priority, not cheaper.
- Making everything a transition to "optimize". Inputs then feel sluggish.
- Confusing `useLayoutEffect` with urgency. Layout effects run synchronously after commit but say nothing about update priority.
- Thinking updates in `setTimeout` are sync like click handlers. They get the default lane.

## Follow-up questions

- **How does React know an update came from a click?** React's event system records the current event priority while dispatching, and `setState` reads it to pick a lane.
- **Can you force an update to be urgent?** Yes, `flushSync` renders synchronously, but use it sparingly (e.g. before measuring DOM).
- **Are urgent updates batched?** Yes. Since React 18, all updates in the same tick are batched regardless of source.

## Quick recap

- Urgent = direct feedback to user input.
- Default for any update not marked as a transition.
- Rendered without yielding, in high-priority lanes.
- Can interrupt in-progress transition renders.
- `flushSync` forces synchronous rendering when needed.
