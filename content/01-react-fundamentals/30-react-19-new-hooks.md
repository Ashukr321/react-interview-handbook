---
title: "What are the new hooks introduced in React v19?"
tags: ["react-19", "hooks", "actions", "use"]
difficulty: "medium"
---

## Short answer

React 19 introduced four new hooks/APIs centred on **Actions** and async data: `use` (read a promise or context during render, even conditionally), `useActionState` (manage the result and pending state of an action), `useFormStatus` (from `react-dom`, read the pending status of the parent `<form>`), and `useOptimistic` (show an optimistic value while an async update is in flight). React 19.2 later added `useEffectEvent` for non-reactive logic inside effects. Each of these has a full page in the "Latest React Features" section.

## Explanation

Before React 19, every form submission meant juggling `isLoading`, `error` and `data` state by hand. Actions are like a delivery service with tracking built in: you hand over the package (the async function), and React tracks pending, success and error status for you.

| Hook | Package | Purpose |
|------|---------|---------|
| `use(resource)` | `react` | Read a promise (suspends until resolved) or context; can be called in conditions and loops |
| `useActionState(action, initialState)` | `react` | Returns `[state, formAction, isPending]` for an action |
| `useFormStatus()` | `react-dom` | Returns `{ pending, data, method, action }` of the enclosing form |
| `useOptimistic(state, updateFn)` | `react` | Temporary optimistic state that reverts if the action fails or finishes |
| `useEffectEvent(fn)` (19.2) | `react` | Read the latest props/state inside an effect without re-running it |

### Related React 19 changes worth mentioning

- `<form action={fn}>` and `startTransition(async () => ...)` support async functions.
- `ref` is a regular prop for function components; `forwardRef` is no longer needed.
- `<Context>` can be rendered directly as a provider.
- Document metadata (`<title>`, `<meta>`) can be rendered inside components.
- `useActionState` replaced the canary `useFormState`.

## Example

```jsx
import { use, useActionState, useOptimistic, Suspense } from "react";
import { useFormStatus } from "react-dom";

// use(): read a promise
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return <ul>{comments.map((c) => <li key={c.id}>{c.text}</li>)}</ul>;
}

// useFormStatus(): must be inside the <form>
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
}

// useActionState + useOptimistic
export function LikeButton({ likes, likePost }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(likes, (current) => current + 1);

  const [error, formAction] = useActionState(async () => {
    addOptimisticLike();
    try {
      await likePost();
      return null;
    } catch {
      return "Could not like post";
    }
  }, null);

  return (
    <form action={formAction}>
      <p>{optimisticLikes} likes</p>
      <SubmitButton />
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function Post({ commentsPromise }) {
  return (
    <Suspense fallback={<p>Loading comments...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

> **⚠️ Gotcha:** `useFormStatus` only reads the status of a `<form>` rendered **above** it. Calling it in the same component that renders the form returns `pending: false`.

## Common mistakes

- Calling `useFormStatus` in the component that renders the form instead of a child.
- Creating the promise passed to `use` inside a Client Component render without caching it.
- Expecting `useOptimistic` to persist values; it reverts to the real state once the action settles.
- Importing `useFormStatus` from `react` instead of `react-dom`.

## Follow-up questions

- **Why can `use` be called conditionally?** It does not keep its own state in an ordered hook slot; it just reads a promise or context, so call order does not matter. It must still be called during render, not in event handlers.
- **What happened to `useFormState`?** It was renamed to `useActionState` and moved to `react`, with an added `isPending` value.
- **Is the React Compiler part of React 19?** It ships separately as a build plugin (stable since late 2025) and works with React 17+.

## Quick recap

- New: `use`, `useActionState`, `useFormStatus`, `useOptimistic`.
- React 19.2 added `useEffectEvent`.
- Actions handle pending, error and optimistic updates for async work.
- `ref` as a prop and `<Context>` as provider simplify common patterns.
