---
title: "What is the use() API and how is it different from other hooks?"
tags: ["react-19", "use", "suspense", "promises", "context"]
difficulty: "hard"
asked_as: ["Can use() be called conditionally?", "use(promise) vs useEffect for data fetching", "use(Context) vs useContext"]
---

## Short answer

`use(resource)` reads the value of a **promise** or a **context** during render. With a promise, the component **suspends** until it resolves (showing the nearest `<Suspense>` fallback), and a rejection goes to the nearest error boundary. Unlike every other hook, `use` **can be called inside `if` statements and loops**. The promise must be **stable**, meaning created outside render: in a Server Component, a loader or a cache. A promise created inside a Client Component's render is recreated every time and suspends forever.

## Explanation

### Why `use` can be conditional

Normal hooks store state in slots matched by **call order**, so the order can never change. `use` stores nothing per call; it only reads a value that already lives somewhere else (the promise or the context provider). So the call-order rule doesn't apply. It must still be called **during render** of a component or hook, not in event handlers or effects.

### `use(promise)` flow

```text
 render -> use(promise)
             |-- pending  -> throw to <Suspense>, show fallback, retry when settled
             |-- resolved -> return the value
             '-- rejected -> throw to nearest error boundary
```

### Where the promise should come from

| Source | OK? |
| --- | --- |
| Server Component passes a promise as a prop to a Client Component | Yes: the recommended pattern |
| A framework loader or a cached function (`cache()`, TanStack Query) | Yes |
| `fetch()` called directly in a Client Component's render | No: a new promise on every render |

### `use(Context)`

It works like `useContext`, but it can be called after an early return or inside a condition.

## Example

```jsx
// app/page.jsx (Server Component): start the request, do not await it
import { Suspense } from "react";
import Comments from "./Comments";

export default function Page({ params }) {
  const commentsPromise = fetchComments(params.id); // starts on the server
  return (
    <Suspense fallback={<p>Loading comments...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

// Comments.jsx (Client Component)
"use client";
import { use } from "react";
import { ThemeContext } from "./theme";

export default function Comments({ commentsPromise, compact }) {
  const comments = use(commentsPromise); // suspends until resolved

  if (compact) return <p>{comments.length} comments</p>;

  const theme = use(ThemeContext); // allowed after an early return
  return (
    <ul className={theme}>
      {comments.map((c) => <li key={c.id}>{c.text}</li>)}
    </ul>
  );
}
```

## Common mistakes

- Creating the promise in a Client Component's render (`use(fetch(url))`). Each render makes a new promise, so it suspends again and again. Create it in a Server Component, a loader or a cache.
- Wrapping `use` in `try/catch`. It is not allowed, because suspending works by throwing; handle errors with an error boundary or `promise.catch()` to return a fallback value.
- Calling `use` in an event handler or effect. It only works during render.
- Forgetting the `<Suspense>` boundary, so the whole page (or the nearest higher boundary) shows a fallback.

## Follow-up questions

- **Is `use` a hook?** The docs call it an API, not a hook, because it breaks the call-order rule. It still can only be called from components and hooks.
- **`use` vs `useEffect` fetching?** `use` lets data start loading before render on the server and integrates with Suspense and streaming. `useEffect` fetching starts only after the first paint and causes request waterfalls.
- **How do you handle a rejected promise without an error boundary?** Pass `promise.catch(() => fallbackValue)` so it resolves instead of rejecting.

## Quick recap

- `use` reads a promise (suspends) or a context during render.
- It can be called conditionally and in loops.
- The promise must be stable: created on the server, in a loader or in a cache.
- Pending goes to `<Suspense>`; rejected goes to an error boundary.
