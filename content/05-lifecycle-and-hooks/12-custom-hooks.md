---
title: "What are custom hooks and how do you build one?"
tags: ["custom-hooks", "hooks", "reuse", "rules-of-hooks"]
difficulty: "medium"
asked_as: ["Write a custom hook", "Do custom hooks share state between components?", "What are the rules of hooks?"]
---

## Short answer

A custom hook is a **JavaScript function whose name starts with `use` and that calls other hooks**. It lets you pull stateful logic (subscriptions, timers, data fetching, form handling) out of components so several components can reuse it. Custom hooks **share logic, not state**: each component that calls the hook gets its own independent copy of the state.

## Explanation

Before hooks, reusing stateful logic meant HOCs or render props, which added wrapper components and made the tree hard to read. A custom hook is just a function, so it composes like one: hooks can call other hooks, take arguments and return anything (a value, an array, an object).

### Rules of hooks (they apply to custom hooks too)

1. **Call hooks only at the top level.** Not inside conditions, loops or nested functions. React matches state to hooks by **call order** on each render, so the order must never change.
2. **Call hooks only from React functions.** That means components and other custom hooks, not plain utility functions or event handlers.
3. **Name it `use...`.** The name tells React's lint rules (`eslint-plugin-react-hooks`) to check the rules inside it.

### When to make one

- The same `useState` + `useEffect` combination appears in two or more components.
- A component is long because of setup logic that hides what it renders.
- You want to give a reusable concept a clear name, like `useOnlineStatus` or `useDebouncedValue`.

Don't make a hook for logic that uses no hooks; a normal function is enough.

## Example

```jsx
import { useEffect, useState, useSyncExternalStore } from "react";

// 1. Debounce any changing value.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // cancel if value changes before delay
  }, [value, delay]);

  return debounced;
}

// 2. Subscribe to a browser API safely, including during concurrent rendering.
function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // client value
    () => true // server value during SSR
  );
}

// Usage: each component gets its own state.
function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);
  const isOnline = useOnlineStatus();

  return (
    <>
      {!isOnline && <p role="status">You are offline.</p>}
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Results query={debouncedQuery} />
    </>
  );
}
```

## Common mistakes

- Expecting two components using `useCounter()` to see the same count. They don't. To share state, lift it up or use context or a store.
- Calling a hook conditionally inside the custom hook (`if (enabled) useEffect(...)`). Put the condition inside the effect instead.
- Returning a new object or function on every render, which breaks `memo` and effect dependencies in the component that uses it. Wrap returned functions in `useCallback` where it matters.
- Naming a hook without `use`, which turns off lint checks, or naming a plain function `useX` when it calls no hooks.

## Follow-up questions

- **Custom hook vs HOC vs render props?** Hooks reuse logic without adding components to the tree and are the default today. HOCs are still useful for wrapping a component's output, for example to add a layout.
- **How do you test a custom hook?** With `renderHook` from `@testing-library/react`, or by testing a small component that uses it.
- **Can a custom hook return JSX?** It can, but then it is really a component. Return data and functions, and let components render.
- **Why does `useOnlineStatus` use `useSyncExternalStore` instead of `useEffect`?** It reads an external value in a way that avoids tearing during concurrent rendering and supports a server snapshot.

## Quick recap

- A custom hook is a `use`-prefixed function that calls other hooks.
- It shares logic, not state; each caller gets its own state.
- The rules of hooks apply: top level only, React functions only.
- Extract one when the same stateful logic appears in more than one place.
