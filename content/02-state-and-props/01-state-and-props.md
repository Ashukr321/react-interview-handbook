---
title: "State & Props"
tags: ["state", "props", "basics"]
difficulty: "easy"
---

## Short answer

**Props** are inputs passed into a component by its parent, like function arguments; they are read-only. **State** is data a component owns and manages itself, and changing it with a setter tells React to re-render. Together they fully determine what a component renders: `UI = f(props, state)`.

## Explanation

Think of a coffee machine. **Props** are the settings you choose from outside: cup size, coffee type. **State** is what the machine tracks internally: water level, whether it is brewing. You control props; the machine controls its state.

### Props

- Passed as JSX attributes: `<Avatar size={48} user={user} />`.
- Received as the first argument of the component (usually destructured).
- Can be any JavaScript value: strings, numbers, objects, arrays, functions, JSX (`children`).
- **Immutable from the child's point of view.** A child never assigns to `props.x`.
- When the parent re-renders with new values, the child receives the new props.

### State

- Declared with `useState` or `useReducer` (or `this.state` in classes).
- Private to the component, but can be passed down as props.
- Updated only via the setter, which schedules a re-render.
- Preserved between renders as long as the component stays at the same position in the tree with the same type and key.
- Treated as immutable: create new objects and arrays instead of mutating.

### How they work together

```text
  Parent [state: count]
     |
     |  props: count, onIncrement
     v
  Child  -> renders count, calls onIncrement on click
     |
     v
  Parent setCount -> re-render -> Child gets new props
```

A parent's state often becomes a child's props. That is the core of React's one-way data flow.

## Example

```jsx
import { useState } from "react";

function Stepper({ label, value, onChange }) {   // props only
  return (
    <div>
      <span>{label}: {value}</span>
      <button onClick={() => onChange(value - 1)}>-</button>
      <button onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export default function Order() {
  const [quantity, setQuantity] = useState(1);   // state

  return (
    <>
      <Stepper label="Quantity" value={quantity} onChange={setQuantity} />
      <p>Total: ${quantity * 5}</p>   {/* derived from state, not stored */}
    </>
  );
}
```

## Common mistakes

- Mutating props (`props.user.name = "x"`) in a child.
- Copying props into state (`useState(props.value)`) and expecting it to stay in sync.
- Storing values in state that can be computed from props or other state.
- Reading state immediately after calling the setter and expecting the new value.

## Follow-up questions

- **Can a child change its parent's state?** Only indirectly, by calling a callback function the parent passed as a prop.
- **What is `children`?** A special prop containing whatever is nested between a component's opening and closing tags.
- **Do props changes always cause a re-render?** Props only change when the parent re-renders, and by default the child re-renders whenever the parent does.

## Quick recap

- Props: external, read-only inputs from the parent.
- State: internal, mutable-through-setter data owned by the component.
- Changing state triggers a re-render; new props flow down.
- `UI = f(props, state)`.
