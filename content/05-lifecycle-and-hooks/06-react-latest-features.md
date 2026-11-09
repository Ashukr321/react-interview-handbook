---
title: "React latest features"
tags: ["react-19", "actions", "server-components", "react-compiler"]
difficulty: "medium"
---

## Short answer

The current major line is **React 19** (stable since December 2024, with 19.1 and 19.2 following in 2025). Its headline features are **Actions** and the hooks around them (`useActionState`, `useFormStatus`, `useOptimistic`), the **`use`** API, **Server Components and Server Actions** as stable features, **`ref` as a prop**, and built-in support for document metadata and stylesheets. React 19.2 added **`<Activity>`** and **`useEffectEvent`**, and the **React Compiler** reached 1.0 for automatic memoization. Check react.dev/blog for anything released after this was written.

## Explanation

Think of React 19 as React taking over chores you used to wire up by hand: pending states for forms, optimistic UI, memoization, and `<head>` tags.

### React 19 core

| Feature | What it does |
|---|---|
| Actions | Async functions passed to `startTransition` or `<form action={fn}>`; React tracks pending state, errors and resets forms |
| `useActionState` | Returns `[state, formAction, isPending]` for an action |
| `useFormStatus` | Child of a form reads `pending`, `data`, `method` without prop drilling |
| `useOptimistic` | Show an optimistic value while an action is in flight; auto-reverts on failure |
| `use(promise / context)` | Read a promise (suspends) or context; can be called conditionally |
| `ref` as prop | Function components receive `ref` directly; `forwardRef` no longer needed |
| Ref cleanup | Callback refs can return a cleanup function |
| `<Context>` as provider | `<ThemeContext value={...}>` instead of `.Provider` |
| Document metadata | `<title>`, `<meta>`, `<link>` rendered anywhere are hoisted to `<head>` |
| Stylesheets and scripts | `precedence` on stylesheets, deduped async scripts, `preload`/`preinit` APIs |
| Server Components / Actions | Stable for frameworks (Next.js App Router, React Router framework mode) |
| Better errors | Hydration diffs, single logged error, `onCaughtError`/`onUncaughtError` root options |

Removed: `propTypes` checks and `defaultProps` for function components, string refs, legacy context, `ReactDOM.render`/`hydrate`, `findDOMNode`, `unmountComponentAtNode`.

### React 19.1 and 19.2

- **Owner stacks** in dev for better debugging (19.1).
- **`<Activity mode="visible" | "hidden">`**: hide UI while preserving state, pre-render offscreen content at low priority (19.2).
- **`useEffectEvent`**: extract non-reactive logic from effects so they do not re-run for values they only read (19.2).
- **`cacheSignal`** for Server Components, **Performance Tracks** in Chrome DevTools, **partial pre-rendering** APIs in `react-dom/static`.

### React Compiler

A build-time Babel/SWC plugin that automatically memoizes components and hooks, making most manual `useMemo`, `useCallback` and `memo` unnecessary. It relies on code following the Rules of React.

## Example

```jsx
import { useActionState, useOptimistic } from "react";
import { useFormStatus } from "react-dom";

async function addTodo(prevState, formData) {
  const title = formData.get("title");
  if (!title) return { ...prevState, error: "Title required" };
  const res = await fetch("/api/todos", { method: "POST", body: JSON.stringify({ title }) });
  const todo = await res.json();
  return { todos: [...prevState.todos, todo], error: null };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Adding..." : "Add"}</button>;
}

export default function Todos() {
  const [state, formAction] = useActionState(async (prev, formData) => {
    addOptimistic(formData.get("title")); // shown until the action finishes
    return addTodo(prev, formData);
  }, { todos: [], error: null });
  const [optimisticTodos, addOptimistic] = useOptimistic(
    state.todos,
    (todos, title) => [...todos, { id: "temp", title }]
  );

  return (
    <>
      <title>Todos</title>
      <form action={formAction}>
        <input name="title" />
        <SubmitButton />
      </form>
      {state.error && <p>{state.error}</p>}
      <ul>{optimisticTodos.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
    </>
  );
}
```

## Common mistakes

- Calling React 18 features like automatic batching or `useTransition` "new in React 19".
- Thinking Server Components work in a plain client-side Vite app without a framework or bundler integration.
- Assuming React Compiler fixes code that breaks the Rules of React (mutating props, reading refs during render).
- Still using `forwardRef` and `.Provider` in new React 19 code; they work but are legacy.

## Follow-up questions

- **What did React 18 introduce?** `createRoot`, concurrent rendering, automatic batching, `useTransition`, `useDeferredValue`, `useId`, `useSyncExternalStore`, streaming SSR with Suspense.
- **How is `use` different from other hooks?** It can be called inside conditions and loops, and it suspends on unresolved promises.
- **When would you use `<Activity>`?** Tabs or navigation where you want hidden screens to keep state and be pre-rendered for instant switching.

## Quick recap

- React 19: Actions, `useActionState`, `useFormStatus`, `useOptimistic`, `use`.
- `ref` as prop, `<Context>` as provider, metadata hoisting.
- Server Components/Actions are stable via frameworks.
- 19.2: `<Activity>`, `useEffectEvent`; React Compiler 1.0 auto-memoizes.
