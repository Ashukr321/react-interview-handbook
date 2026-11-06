---
title: "What are inline functions in React?"
tags: ["performance", "events", "useCallback"]
difficulty: "easy"
---

## Short answer

An inline function is a function defined directly inside JSX, usually as an event handler: `onClick={() => setCount(count + 1)}`. A new function object is created on every render. That is cheap and usually fine; it only matters when the function is passed to a memoized child (`React.memo`) or used as an effect dependency, because the new reference breaks the equality check.

## Explanation

Creating a function in JavaScript is like writing a sticky note: fast and cheap. The problem is not the cost of writing the note, it is that a memoized child compares props by reference. A brand-new note, even with the same text, is "different", so the child re-renders anyway.

### When inline functions are fine

- Handlers on plain DOM elements (`<button onClick={...}>`). React does not attach a new listener per render; it uses delegation at the root.
- Passing arguments: `onClick={() => remove(item.id)}`.
- Most components, which are not memoized anyway.

### When they cause trouble

- Props to a `React.memo` child or a `PureComponent`: every render produces a new reference, so memoization never hits.
- Dependencies of `useEffect`/`useMemo`: the effect re-runs every render.
- Very long lists where each row is memoized.

Fixes: `useCallback`, moving the function outside the component if it uses no props/state, or letting **React Compiler** auto-memoize it (in React 19 projects that enable the compiler, manual `useCallback` is mostly unnecessary).

## Example

```jsx
import { memo, useCallback, useState } from "react";

const Row = memo(function Row({ item, onRemove }) {
  console.log("render row", item.id);
  return <li>{item.name} <button onClick={() => onRemove(item.id)}>x</button></li>;
});

export default function List() {
  const [items, setItems] = useState([{ id: 1, name: "Milk" }, { id: 2, name: "Eggs" }]);
  const [text, setText] = useState("");

  // Stable reference: typing in the input does not re-render every Row
  const handleRemove = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} /> {/* inline: fine */}
      <ul>
        {items.map((item) => (
          <Row key={item.id} item={item} onRemove={handleRemove} />
        ))}
      </ul>
    </>
  );
}
```

## Common mistakes

- Writing `onClick={handleClick()}` instead of `onClick={handleClick}` or `onClick={() => handleClick()}`. The first calls the function during render.
- Wrapping every handler in `useCallback` "for performance". It adds overhead and noise when the child is not memoized.
- Using `useCallback` with stale dependencies, producing handlers that see old state. Prefer functional updates (`setX(prev => ...)`).

## Follow-up questions

- **Does an inline handler add a new DOM listener every render?** No. React delegates events to the root, so it only swaps the function it calls.
- **What is the difference between `useCallback(fn, deps)` and `useMemo(() => fn, deps)`?** None in result; `useCallback` is shorthand for memoizing a function.
- **How does React Compiler change this?** It automatically memoizes values and callbacks at build time, so inline functions stop breaking memoized children.

## Quick recap

- Inline function = defined inside JSX, new reference each render.
- Creation cost is negligible; reference identity is what matters.
- Problems appear with `memo` children and hook dependencies.
- Fix with `useCallback`, hoisting, or React Compiler, only where it helps.
