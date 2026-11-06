---
title: "A child wrapped with React.memo still re-renders. Why?"
tags: ["react-memo", "memoization", "re-renders", "performance"]
difficulty: "medium"
---

## Short answer

`React.memo` only skips a render when **every prop is shallowly equal** (`Object.is`) to the previous one. Most often the parent creates a new object, array, function or JSX element on every render, so the comparison fails. The child can also re-render for reasons `memo` doesn't cover: its own state, a context it reads, or a custom hook that updates.

## Why it happens

`memo` compares props one by one with `Object.is`. Two values that *look* the same but are different references fail that check.

| Prop passed by parent | New reference each render? |
| --- | --- |
| `count={5}` / `label="Hi"` | No (primitives) |
| `style={{ color: "red" }}` | Yes |
| `items={data.filter(...)}` | Yes |
| `onClick={() => save(id)}` | Yes |
| `children={<Icon />}` / nested JSX | Yes (JSX creates a new element object) |

Re-renders that `memo` never blocks:

- **Own state** changes (`useState`, `useReducer`) inside the child.
- **Context**: if the child calls `useContext(ThemeContext)` and the provider's `value` changes, it re-renders regardless of props.
- **Custom hooks** that hold state or subscribe to a store (`useSelector`, `useSyncExternalStore`) trigger renders from the inside.
- **A changed `key`** remounts the component entirely.

## How to fix it

1. Find which prop changed (React DevTools Profiler, "Why did this render?").
2. Stabilize that prop.

```jsx
import { memo, useCallback, useMemo, useState } from "react";

const Chart = memo(function Chart({ options, onSelect }) {
  return <div onClick={() => onSelect(options.type)}>{options.type}</div>;
});

export default function Dashboard({ type }) {
  const [count, setCount] = useState(0);

  // stable while `type` is unchanged
  const options = useMemo(() => ({ type, animate: true }), [type]);
  const handleSelect = useCallback((t) => console.log("selected", t), []);

  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count}</button>
      <Chart options={options} onSelect={handleSelect} />
    </>
  );
}
```

3. Hoist truly static values (`const DEFAULT_OPTIONS = {...}`) outside the component.
4. Pass primitives instead of objects when you can (`type={type}` rather than `options={{ type }}`).
5. For context, split providers or memoize the `value` object.

> **💡 Interview tip:** With the **React Compiler** (stable since v1.0) enabled, the compiler memoizes those objects, callbacks and JSX for you at build time, so most manual `useMemo`/`useCallback` wiring disappears.

## How to verify

- In the Profiler, enable "Record why each component rendered while profiling"; it lists the exact prop or hook that changed.
- Temporarily log inside the child, or use a custom `arePropsEqual` that logs which key differs.
- After the fix, interacting with the parent should show the child as "Did not render" (grey) in the flame graph.

## Follow-up questions

- **Does `memo` do a deep comparison?** No, it's shallow. You can pass a custom comparator as the second argument, but deep checks can cost more than the render you're skipping.
- **Why does passing `children` break `memo`?** JSX like `<Icon />` makes a new element object each render, so the `children` prop is never equal.
- **Is `memo` a guarantee?** No. React treats it as a performance hint, not a semantic guarantee.

## Quick recap

- `memo` = shallow `Object.is` check on each prop.
- Inline objects, arrays, functions and JSX break it.
- State, context and store subscriptions bypass it entirely.
- Stabilize props with `useMemo`/`useCallback`, hoisting, or the React Compiler.
