---
title: "What are Pure Components in React?"
tags: ["performance", "purecomponent", "memo", "class-components"]
difficulty: "medium"
---

## Short answer

`React.PureComponent` is a class component base that implements `shouldComponentUpdate` with a **shallow comparison** of props and state, so it skips re-rendering when nothing changed at the top level. The function-component equivalent is `React.memo`, which shallow-compares props. Separately, "pure" also describes the React rule that components must be pure functions: same inputs, same output, no side effects during render.

## Explanation

Imagine a receptionist who only calls you if the list of visitors is actually different from last time. That is a pure component: before re-rendering, it compares each prop (and state key) with `Object.is`. If all are equal, React reuses the previous output.

### Shallow comparison

- Primitives are compared by value: `5 === 5`.
- Objects, arrays and functions are compared by **reference**. A new `{}` or `() => {}` every render always counts as "changed".
- Mutating an object in place keeps the same reference, so a pure component **will not** re-render even though the data changed.

| | `Component` | `PureComponent` | `React.memo(Fn)` |
|---|---|---|---|
| Type | Class | Class | Function wrapper |
| Re-renders when parent renders | Always | Only if props/state shallow-changed | Only if props shallow-changed |
| Custom compare | `shouldComponentUpdate` | No | Second argument `arePropsEqual` |
| State/context changes | Re-render | Re-render | Re-render (memo only checks props) |

### Is it still relevant?

`PureComponent` still works but class components are legacy for new code. In modern React, use `memo` where profiling shows a benefit, or let React Compiler memoize automatically.

## Example

```jsx
import { PureComponent, memo, useState } from "react";

class PriceTag extends PureComponent {
  render() {
    console.log("PriceTag render");
    return <span>${this.props.amount}</span>;
  }
}

const Avatar = memo(function Avatar({ user }) {
  console.log("Avatar render");
  return <img src={user.photo} alt={user.name} />;
});

const user = { name: "Ada", photo: "/ada.png" }; // stable reference (module scope)

export default function Card() {
  const [likes, setLikes] = useState(0);
  return (
    <div>
      <PriceTag amount={20} />  {/* skipped on like clicks */}
      <Avatar user={user} />    {/* skipped on like clicks */}
      <button onClick={() => setLikes(likes + 1)}>Like {likes}</button>
    </div>
  );
}
```

## Common mistakes

- Mutating props/state (`this.state.items.push(x)`) and wondering why the pure component did not update. Always create new objects.
- Passing inline objects or functions (`style={{...}}`, `onClick={() => ...}`) to a memoized child, which defeats the shallow check.
- Wrapping everything in `memo`. The comparison itself costs time; use it for expensive or frequently re-rendered subtrees.
- Assuming `memo` blocks context updates. A component re-renders when a context it reads changes.

## Follow-up questions

- **What is a "pure function" in React's rules?** Rendering must not mutate external values or cause side effects; given the same props, state and context it returns the same JSX. Strict Mode double-renders in development to catch violations.
- **How do you write a custom comparison for `memo`?** Pass `(prevProps, nextProps) => boolean` as the second argument; return `true` to skip the render.
- **Why might a `PureComponent` render more than expected?** A parent creates new object/array/function props each render.

## Quick recap

- `PureComponent` = class with shallow props/state comparison.
- `React.memo` = same idea for function components (props only).
- Shallow means references for objects/functions.
- Never mutate; avoid new references in props.
