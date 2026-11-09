---
title: "Which function is used for updating the state of a component?"
tags: ["state", "useState", "useReducer", "setState"]
difficulty: "easy"
---

## Short answer

In **class components**, state is updated with `this.setState()`. In **function components**, you use the **setter function** returned by `useState` (for example `setCount`) or the `dispatch` function returned by `useReducer`. All of them schedule a re-render; you never assign to state directly.

## Explanation

Updating state is like changing a booking through the hotel desk rather than editing the paper ledger yourself. Only the desk (the setter) can record the change and notify housekeeping (re-render).

| Component type | Declare state | Update function | Example |
|----------------|---------------|-----------------|---------|
| Class | `this.state = {...}` | `this.setState(obj \| fn, callback?)` | `this.setState({ open: true })` |
| Function | `const [v, setV] = useState(init)` | `setV(next \| fn)` | `setOpen(true)` |
| Function (complex) | `const [s, dispatch] = useReducer(reducer, init)` | `dispatch(action)` | `dispatch({ type: "open" })` |

### Two forms of the setter

1. **Direct value**: `setCount(5)`. Use when the new value does not depend on the old one.
2. **Updater function**: `setCount(c => c + 1)`. Use when it does, so queued updates use the latest value.

### When to choose `useReducer`

- Several related values change together.
- The next state depends on complex logic.
- You want update logic in a pure, testable function outside the component.

### Other ways state changes

- React 19 `useActionState` returns a `formAction` that updates state from an action's return value.
- External stores (Redux Toolkit, Zustand) have their own update APIs (`dispatch`, `set`), subscribed via hooks.

## Example

```jsx
import { useReducer, useState } from "react";

// useState setter
function Toggle() {
  const [on, setOn] = useState(false);
  return <button onClick={() => setOn((prev) => !prev)}>{on ? "On" : "Off"}</button>;
}

// useReducer dispatch
function cartReducer(state, action) {
  switch (action.type) {
    case "add":
      return { ...state, items: [...state.items, action.item] };
    case "clear":
      return { ...state, items: [] };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function Cart() {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  return (
    <>
      <p>{state.items.length} items</p>
      <button onClick={() => dispatch({ type: "add", item: { id: Date.now() } })}>Add</button>
      <button onClick={() => dispatch({ type: "clear" })}>Clear</button>
    </>
  );
}

export default function App() {
  return (
    <>
      <Toggle />
      <Cart />
    </>
  );
}
```

## Common mistakes

- Assigning directly: `this.state.x = 1` or `count = count + 1`. Nothing re-renders.
- Calling the setter during render without a condition, causing an infinite loop.
- Using a direct value when updates depend on the previous state (lost updates when batched).
- Expecting the state variable to change immediately after calling the setter.

## Follow-up questions

- **Is the `useState` setter stable?** Yes, React guarantees its identity does not change, so it is safe to omit from dependency arrays.
- **Can you set state on an unmounted component?** It is a no-op in React 18+ (the warning was removed), but you should still cancel async work in cleanup.
- **How do you initialise state from an expensive computation?** Pass a function: `useState(() => computeInitial())`, which runs only on the first render.

## Quick recap

- Classes: `this.setState`.
- Functions: `useState` setter or `useReducer` dispatch.
- Use updater functions when the new value depends on the old.
- Never assign to state directly.
