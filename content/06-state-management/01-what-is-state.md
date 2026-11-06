---
title: "What is State in React?"
tags: ["state", "useState", "fundamentals"]
difficulty: "easy"
---

## Short answer

State is data that a component owns and that can change over time. When state changes through its setter (`setState` / `dispatch`), React re-renders that component and its children so the UI reflects the new value. Think of it as the component's memory between renders: `UI = f(state)`.

## Explanation

A component is a function that React calls on every render. Normal local variables are recreated each time, so they cannot "remember" anything. State is stored by React outside the function and handed back to you on each render.

Real-life analogy: a whiteboard in a meeting room. Each meeting (render) reads what is on the board. If you want the next meeting to see something different, you must write on the board (call the setter), not scribble on your own notepad (a local variable).

### Key properties

- **Owned and private**: state belongs to the component that declares it. Children receive it as props.
- **Triggers re-render**: only updating via the setter tells React something changed.
- **Snapshot per render**: inside one render, `count` is a fixed value. Calling `setCount` does not change the variable you are holding; it schedules a new render.
- **Updates are batched**: multiple setters in the same event (and since React 18, in timeouts and promises too) produce one re-render.
- **Immutable updates**: React compares with `Object.is`. Mutating an object and passing the same reference skips the re-render.

### State vs props

| | State | Props |
|---|---|---|
| Owned by | The component itself | The parent |
| Changeable by component | Yes, via setter | No, read-only |
| Causes re-render when changed | Yes | Yes (parent re-renders with new props) |

### Hooks that hold state

- `useState` for simple values.
- `useReducer` when the next state depends on complex logic or many actions.
- `useRef` stores a value across renders but does **not** trigger a re-render, so it is not "state" in the UI sense.

## Example

```jsx
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState({ name: "Asha", age: 25 });

  function incrementTwice() {
    // functional updates read the latest queued value
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  function birthday() {
    // new object, not a mutation
    setUser((u) => ({ ...u, age: u.age + 1 }));
  }

  return (
    <div>
      <p>{count}</p>
      <button onClick={incrementTwice}>+2</button>
      <p>{user.name} is {user.age}</p>
      <button onClick={birthday}>Birthday</button>
    </div>
  );
}
```

## Common mistakes

- Mutating state directly (`user.age++; setUser(user)`) so React sees the same reference and skips rendering.
- Reading state right after setting it and expecting the new value; it is a snapshot until the next render.
- Storing derived data (e.g. `fullName` from `first` + `last`) in state instead of computing it during render.
- Using `setCount(count + 1)` twice and expecting +2; use the updater function.

## Follow-up questions

- **Is setState synchronous or asynchronous?** It is neither exactly: it schedules an update that React batches and applies on the next render, so the current variable does not change.
- **When would you use useReducer instead of useState?** When several pieces of state change together or transitions follow clear actions, like a form wizard or cart.
- **Why does React need immutability?** It uses cheap reference checks (`Object.is`) to decide whether something changed; immutability makes those checks reliable.

## Quick recap

- State is component memory that survives re-renders.
- Changing it through the setter triggers a re-render.
- Each render sees a snapshot; use functional updates for chained changes.
- Always update immutably; derive what you can instead of storing it.
