---
title: "Difference between State and Props"
tags: ["state", "props", "comparison"]
difficulty: "easy"
---

## Short answer

Props are passed **into** a component from its parent and are read-only inside it; state is managed **within** a component and can change over time through its setter. Props make a component configurable and reusable, state makes it interactive. When either changes, the component re-renders.

## Explanation

A person's **name and birthday** are like props: given to them by someone else, and they cannot change them alone. Their **mood** is like state: it belongs to them and changes in response to events.

| Aspect | Props | State |
|--------|-------|-------|
| Owner | Parent component | The component itself |
| Mutable? | No, read-only in the child | Yes, but only via the setter |
| Set by | Parent, as JSX attributes | `useState`/`useReducer` initial value, then setters |
| Purpose | Configure and pass data down | Track data that changes over time |
| Triggers re-render | When parent re-renders with them | When the setter is called with a new value |
| Accessible by children | Can be passed further down | Passed down as props |
| Default values | Default parameters (`{ size = "md" }`) | Initial value in `useState` |
| Function analogy | Function parameters | Variables declared inside the function that persist |

### Deciding which one to use

Ask these questions about a piece of data (from the React docs' "Thinking in React"):

1. Is it passed in from a parent? Then it is a **prop**.
2. Does it stay the same over time? Then it is **not state**.
3. Can you compute it from other props or state? Then it is **not state**, derive it.
4. Otherwise, it is **state**, and it belongs in the closest common owner of all components that use it.

## Example

```jsx
import { useState } from "react";

// `title` and `initialOpen` are props; `open` is state
function Collapsible({ title, initialOpen = false, children }) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <section>
      <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {title}
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

export default function FAQ() {
  return (
    <>
      <Collapsible title="What is React?">A UI library.</Collapsible>
      <Collapsible title="Is it free?" initialOpen>Yes, MIT licensed.</Collapsible>
    </>
  );
}
```

`initialOpen` is only read on the first render; naming it `initial*` makes clear that later changes are ignored.

## Common mistakes

- Saying "props cannot change". They can change between renders; the child just cannot change them.
- Mirroring a prop in state without a reason, which creates two sources of truth.
- Storing everything in state, including constants and derived values.
- Passing state setters many levels down instead of using Context or composition.

## Follow-up questions

- **What if a child needs to reset its state when a prop changes?** Pass a `key` derived from that prop so React remounts the child.
- **Can state be passed as props?** Yes, that is the normal way to share data with children.
- **Where do Context values fit?** They behave like props delivered from a distant ancestor: read-only to consumers, owned as state by the provider.

## Quick recap

- Props: from parent, read-only, for configuration.
- State: owned locally, changes over time, triggers re-renders.
- Derived values are neither; compute them.
- A parent's state usually becomes a child's props.
