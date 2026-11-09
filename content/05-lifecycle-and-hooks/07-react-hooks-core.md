---
title: "React Hooks (useState, useEffect, useReducer, useContext)"
asked_as: ["Concept of React Hooks."]
tags: ["hooks", "useState", "useEffect", "useReducer", "useContext"]
difficulty: "medium"
---

## Short answer

Hooks are functions that let function components use React features like state, side effects and context. `useState` stores a value that triggers re-renders, `useEffect` synchronizes with external systems after render, `useReducer` manages complex state through a reducer function, and `useContext` (or `use` in React 19) reads a value provided higher in the tree. Hooks must be called at the top level of a component or custom hook, in the same order every render.

## Explanation

Before hooks (React 16.8), state and lifecycle required classes, and logic reuse needed HOCs or render props. Hooks let you plug features into plain functions, like snapping tools onto a power drill.

### Why the rules of hooks exist

React stores hook state in a **linked list on the component's fiber**, matched by call order. If a hook is called conditionally, the order shifts and state gets attached to the wrong hook.

1. Only call hooks at the top level (no conditions, loops, or nested functions).
2. Only call hooks from components or custom hooks (`useSomething`).
   (Exception: `use` may be called conditionally.)

### The four core hooks

| Hook | Use for | Key points |
|---|---|---|
| `useState(init)` | Simple local state | Setter accepts value or updater `prev => next`; lazy init with `useState(() => expensive())` |
| `useEffect(fn, deps)` | Subscriptions, fetching, DOM sync, timers | Runs after paint; return cleanup; deps decide re-runs |
| `useReducer(reducer, init)` | State with many related fields or transitions | `dispatch(action)`; logic testable outside React; `dispatch` is stable |
| `useContext(Ctx)` | Read shared values (theme, user) | Re-renders on every value change; React 19 prefers `use(Ctx)` |

### useState vs useReducer

Choose `useReducer` when the next state depends on the previous one in several ways, when multiple values change together, or when you want transitions named as actions (`"added"`, `"removed"`).

### Custom hooks

Extract reusable stateful logic: `useOnlineStatus`, `useDebounce`, `useFetch`. Each call gets **its own state**; custom hooks share logic, not state.

## Example

```jsx
import { createContext, useContext, useEffect, useReducer, useState } from "react";

const CurrencyContext = createContext("USD");

function cartReducer(state, action) {
  switch (action.type) {
    case "added":
      return [...state, action.item];
    case "removed":
      return state.filter((i) => i.id !== action.id);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function useDocumentTitle(title) {       // custom hook
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}

function Cart() {
  const currency = useContext(CurrencyContext);
  const [items, dispatch] = useReducer(cartReducer, []);
  const [name, setName] = useState("");

  useDocumentTitle(`Cart (${items.length})`);

  return (
    <>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={() => { dispatch({ type: "added", item: { id: crypto.randomUUID(), name } }); setName(""); }}>
        Add
      </button>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            {i.name} ({currency}) <button onClick={() => dispatch({ type: "removed", id: i.id })}>x</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function App() {
  return <CurrencyContext value="EUR"><Cart /></CurrencyContext>;
}
```

## Common mistakes

- Calling hooks inside `if`, loops or callbacks.
- Mutating state (`items.push`) instead of returning new objects/arrays.
- Missing or wrong effect dependencies, causing stale data or infinite loops.
- Using `useEffect` for derived data (`fullName = first + last`) that should be computed during render.
- Putting a new object in a context value every render, re-rendering all consumers.

## Follow-up questions

- **Can hooks be used in class components?** No. Wrap the class or use a function component.
- **Why is `setState` stable but values are not?** React guarantees setter and `dispatch` identities never change; values are per-render snapshots.
- **What other built-in hooks exist?** `useRef`, `useMemo`, `useCallback`, `useLayoutEffect`, `useId`, `useTransition`, `useDeferredValue`, `useSyncExternalStore`, `useImperativeHandle`, `useActionState`, `useOptimistic`, `useEffectEvent`, `useFormStatus` (react-dom).

## Quick recap

- Hooks add state, effects and context to function components.
- Call them unconditionally at the top level, same order every render.
- `useState` for simple state, `useReducer` for complex transitions.
- `useEffect` syncs with external systems; `useContext`/`use` read shared values.
- Custom hooks share logic, not state.
