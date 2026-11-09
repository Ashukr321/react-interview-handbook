---
title: "When will the render method fire?"
tags: ["rendering", "re-render", "performance", "lifecycle"]
difficulty: "medium"
---

## Short answer

A component renders (its `render()` method or function body runs) on **initial mount**, and then re-renders when: its **state changes** (`setState`/`useState` setter with a new value), its **parent re-renders** (even if props look the same, unless it is memoized), a **context** it reads changes, `forceUpdate()` is called (classes), or an external store it subscribes to changes. A changed `key` or element type causes a remount, which also renders.

## Explanation

Rendering is React asking your component "what should this look like now?". It is a calculation, not a DOM update. React only touches the DOM if the result differs.

### Triggers

| Trigger | Notes |
|---|---|
| Initial mount | Always renders once (twice in dev Strict Mode) |
| State update | Hooks bail out if `Object.is(old, new)`; class `setState` always re-renders unless `shouldComponentUpdate` says no |
| Parent re-render | All children re-render by default, regardless of props |
| Context value change | Every consumer of that context re-renders, even through `memo` |
| External store | `useSyncExternalStore` (Redux, Zustand) re-renders when the selected snapshot changes |
| `forceUpdate()` | Class only; skips `shouldComponentUpdate` |
| `key` / type change | Unmount + mount, so a fresh render |

### What does NOT trigger a render

- Mutating a ref (`ref.current = x`).
- Mutating state objects in place (`state.items.push(x)`) without calling a setter with a new reference.
- Changing a regular variable or module variable.
- Props changing on their own: props only "change" because the parent rendered.

### How to prevent unnecessary renders

- `React.memo` (function) / `PureComponent` / `shouldComponentUpdate` (class).
- Stable props: `useMemo`, `useCallback`, or React Compiler.
- Move state down closer to where it is used; pass expensive subtrees as `children`.
- Split contexts by concern.

```text
setState in Parent
   |
Parent renders
   |---> Child A renders (not memoized)
   |---> Child B (memo, same props) -> skipped
   |---> Child C (memo, reads changed context) -> renders
   |
Diff -> commit only the DOM nodes that changed
```

## Example

```jsx
import { memo, useState, createContext, use } from "react";

const ThemeContext = createContext("light");

const Plain = () => { console.log("Plain render"); return <p>plain</p>; };

const Memoized = memo(function Memoized({ label }) {
  console.log("Memoized render");
  return <p>{label}</p>;
});

const Themed = memo(function Themed() {
  const theme = use(ThemeContext);
  console.log("Themed render");
  return <p>{theme}</p>;
});

export default function App() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState("light");

  return (
    <ThemeContext value={theme}>
      <button onClick={() => setCount(count + 1)}>Count {count}</button>   {/* Plain renders; others skip */}
      <button onClick={() => setCount(count)}>Same value</button>          {/* bail-out: no child renders */}
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>Theme</button> {/* Themed renders */}
      <Plain />
      <Memoized label="static" />
      <Themed />
    </ThemeContext>
  );
}
```

## Common mistakes

- Believing a component re-renders only when its props change. Parent renders are the most common trigger.
- Confusing "render" with "DOM update"; most renders produce no DOM change.
- Mutating state and wondering why nothing re-renders.
- Calling `setState` during render unconditionally, causing an infinite loop.

## Follow-up questions

- **Why does my component render twice in development?** Strict Mode double-invokes render functions to surface impure code; production renders once.
- **Does `setState` with the same value ever render?** React may render the component once more before bailing out, but it will not re-render children or commit.
- **How do you find why a component rendered?** React DevTools Profiler with "Record why each component rendered".

## Quick recap

- Render on mount, state change, parent render, context change, store change, `forceUpdate`.
- Refs and mutations do not trigger renders.
- Rendering is computing; committing changes the DOM.
- Use `memo`, stable props and state colocation to skip work.
