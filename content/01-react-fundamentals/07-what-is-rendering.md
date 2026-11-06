---
title: "What is Rendering in React?"
tags: ["rendering", "re-render", "commit"]
difficulty: "easy"
---

## Short answer

In React, "rendering" means React **calling your component function** to find out what the UI should look like. It is not the same as updating the DOM. After rendering, React compares the result with the previous output and, in the **commit** phase, applies only the necessary DOM changes. Then the browser paints.

## Explanation

A restaurant analogy from the React docs: a **trigger** is the customer's order, **render** is the chef preparing the dish, and **commit** is the waiter placing it on the table.

```text
 Trigger                Render                    Commit              Paint
 (initial mount    ->   React calls        ->     React updates   ->  Browser
  or state change)      components, builds        changed DOM         draws pixels
                        new element tree          nodes only
```

### What triggers a render

1. **Initial render**: `createRoot(el).render(<App />)`.
2. **State update**: `setState` / a `useState` setter / `useReducer` dispatch.
3. **Parent re-render**: by default, when a component renders, all of its children render too.
4. **Context change**: components that read a context re-render when its value changes.

Props changing is not a separate trigger; props change *because* a parent re-rendered.

### Re-render does not mean DOM update

If a component re-renders but returns the same output, React's reconciliation finds no differences and touches nothing in the DOM. Re-renders cost CPU time, not DOM work, which is why most are harmless.

### Rendering must be pure

During render, a component should only compute JSX from props, state and context. No fetching, no subscriptions, no mutating outside variables. Side effects go in event handlers or `useEffect`. `StrictMode` renders components twice in development to catch impure code.

### Controlling re-renders

- `React.memo` skips a child render when props are shallowly equal.
- `useMemo` / `useCallback` keep references stable.
- Move state down or lift content up (pass children) to limit what re-renders.
- The React Compiler can apply memoization automatically.

## Example

```jsx
import { useState } from "react";

function Child() {
  console.log("Child rendered"); // logs on every parent render
  return <p>I am static</p>;
}

export default function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child />
    </>
  );
}
```

`Child` re-renders on each click, but its DOM is never touched because its output is unchanged.

## Common mistakes

- Equating "render" with "DOM update".
- Believing a child re-renders only when its props change. Without `memo`, it re-renders whenever its parent does.
- Running side effects (API calls, `localStorage` writes) in the render body.
- Setting state during render unconditionally, which causes an infinite loop.

## Follow-up questions

- **How does React batch renders?** Since React 18, multiple state updates in the same tick (including in promises and timeouts) are batched into one render.
- **What is the difference between render and commit?** Render computes the new tree and can be interrupted; commit applies DOM changes synchronously and runs effects.
- **How do you find unnecessary renders?** Use React DevTools Profiler and "Highlight updates when components render".

## Quick recap

- Rendering = React calling your components.
- Trigger, render, commit, paint.
- Re-renders do not always change the DOM.
- Keep render pure; put side effects elsewhere.
