---
title: "What actually triggers a re-render?"
tags: ["re-render", "state", "context", "props"]
difficulty: "easy"
---

## Short answer

A component re-renders for exactly four reasons: its own state changes (`useState`/`useReducer` setter), a context it reads changes, its parent re-renders, or an external store it subscribes to via `useSyncExternalStore` changes (which is how libraries like Redux and Zustand trigger renders). Props changing is not a trigger on its own; props only change because a parent re-rendered.

## Explanation

### The triggers

| Trigger | Mechanism |
|---|---|
| State update | Setter enqueues an update and marks the fiber's lanes |
| Context change | Provider `value` differs (`Object.is`), consumers are marked |
| Parent re-render | Children get a new props object and render too (unless memoized) |
| External store | `useSyncExternalStore` subscription detects a new snapshot and schedules an update |
| Initial mount / `key` change | Not a re-render: a fresh mount |

Things that do **not** trigger a re-render:

- Mutating a `useRef` value.
- Mutating state objects without calling a setter.
- Changing a regular variable or module-level variable.
- Props "changing" on their own (they can't).

```text
                setState / context / store
                          |
                          v
   Parent re-renders -> Child re-renders -> Grandchild re-renders
                          ^
                memo + equal props stops the cascade here
```

Analogy: a manager (parent) calling a team meeting means everyone in the team attends, even if the agenda doesn't concern them, unless they've been told "only come if your item changed" (`memo`).

## Example

```jsx
import { createContext, useContext, useState, useRef, memo } from "react";

const ThemeContext = createContext("light");

export default function App() {
  const [theme, setTheme] = useState("light");
  const [count, setCount] = useState(0);
  const renders = useRef(0);
  renders.current++; // mutating a ref: no re-render

  return (
    <ThemeContext.Provider value={theme}>
      <button onClick={() => setCount((c) => c + 1)}>count {count}</button>
      <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>theme</button>
      <Plain />        {/* re-renders on every App render */}
      <Memoized />     {/* skips count changes, but re-renders on theme (context) */}
    </ThemeContext.Provider>
  );
}

function Plain() {
  return <p>Plain child</p>;
}

const Memoized = memo(function Memoized() {
  const theme = useContext(ThemeContext);
  return <p>Theme: {theme}</p>;
});
```

## Common mistakes

- Saying "a component re-renders when its props change". It re-renders when its parent does, whether props changed or not.
- Passing a new object as context `value` every render (`value={{ user }}`), re-rendering all consumers each time. Memoize it with `useMemo`.
- Expecting `useRef` updates to show on screen.

> **💡 Interview tip:** "Props change is a consequence, not a cause" is a crisp line that interviewers like.

## Follow-up questions

- **Does calling `setState` with the same value trigger a render?** React compares with `Object.is` and usually bails out.
- **Do custom hooks trigger renders?** Only through the state, context or store subscriptions they use internally.
- **What about Server Components?** They don't re-render on the client; a refresh or navigation re-fetches their payload.

## Quick recap

- Triggers: own state, context, parent render, external store.
- Props changes are a result of parent renders.
- Refs and plain variables never trigger renders.
- `memo` stops parent-driven cascades, not context or state ones.
