---
title: "What is batching in React?"
tags: ["batching", "state", "rendering"]
difficulty: "easy"
---

## Short answer

Batching means React groups multiple state updates made in the same tick into a single re-render and a single commit, instead of rendering after each `setState`. It avoids wasted renders and prevents the UI from showing "half-updated" intermediate states. Since React 18 with `createRoot`, batching is automatic everywhere: event handlers, promises, timeouts and native event listeners.

## Explanation

When you call a state setter, React doesn't render immediately. It enqueues the update on the fiber's hook queue, marks the lane, and schedules a render for the root (a microtask for sync lanes, a Scheduler task otherwise). Any other updates queued before that render runs are processed together.

```text
setA(1)  -> queue update, schedule render
setB(2)  -> queue update (render already scheduled)
setC(3)  -> queue update
---- end of current task / microtask ----
one render (reads A=1, B=2, C=3) -> one commit -> one paint
```

Analogy: a waiter who collects the whole table's order before going to the kitchen, instead of running back after each person speaks.

### Why it matters

| Without batching | With batching |
|---|---|
| N updates → N renders → N commits | N updates → 1 render → 1 commit |
| UI may briefly show inconsistent state | All changes appear together |
| Effects may run for intermediate states | Effects see the final state |

### Consequences for your code

- State isn't updated immediately after calling the setter. Reading `count` right after `setCount(count + 1)` still gives the old value (it's a snapshot of that render).
- To update based on the previous value multiple times, use the updater form: `setCount(c => c + 1)`.
- Updates of different priority (e.g. one inside `startTransition`) are batched by lane, so they may render separately.

## Example

```jsx
import { useState } from "react";

export default function Profile() {
  const [name, setName] = useState("");
  const [age, setAge] = useState(0);
  const [saved, setSaved] = useState(false);
  console.log("render"); // logs once per click, not three times

  const handleSave = () => {
    setName("Ada");
    setAge(36);
    setSaved(true);
  };

  const addThree = () => {
    // Updater functions are applied in order within the batch -> +3
    setAge((a) => a + 1);
    setAge((a) => a + 1);
    setAge((a) => a + 1);
  };

  return (
    <>
      <button onClick={handleSave}>Save</button>
      <button onClick={addThree}>+3 age</button>
      <p>{saved ? `${name}, ${age}` : "Not saved"}</p>
    </>
  );
}
```

## Common mistakes

- Expecting `setCount(count + 1)` three times to add 3. All three read the same snapshot, so it adds 1.
- Reading state right after setting it and expecting the new value.
- Thinking batching delays the update noticeably. It's processed within the same task or the next microtask.

## Follow-up questions

- **How do I force an update to apply immediately?** `flushSync(() => setX(v))` from `react-dom` renders and commits synchronously.
- **Does batching combine updates across different components?** Yes. All updates scheduled on the same root in the same tick and lane render together.
- **Are `useReducer` dispatches batched?** Yes, exactly like `useState` setters.

## Quick recap

- Batching = many updates, one render, one commit.
- Automatic everywhere with `createRoot` (React 18+).
- State is a per-render snapshot; use updater functions.
- `flushSync` opts out when you truly need it.
