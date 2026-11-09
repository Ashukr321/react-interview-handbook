---
title: "You navigate away from a page, but an API request still updates state. How would you fix it?"
tags: ["scenario", "useEffect", "cleanup", "AbortController", "race-condition"]
difficulty: "medium"
---

## Short answer

Return a cleanup function from the effect that cancels the request with an `AbortController` (or at least sets an `ignore` flag), so when the component unmounts or its inputs change, the old response is dropped. Even better, fetch with a library (TanStack Query, RTK Query) or router loaders, which cancel or ignore stale requests for you.

## Why it happens

Effects start async work, but the promise does not know the component is gone. When it resolves, `.then(setData)` still runs.

```text
 /users/1 mounts -> fetch user 1 (slow, 3 s)
 user navigates away after 1 s -> component unmounts (no cleanup)
 2 s later: response arrives -> setUser(...) on an unmounted component
```

Consequences:

- Wasted network and CPU work.
- **Race conditions**: going from `/users/1` to `/users/2` quickly can show user 1's data if its response arrives last.
- Side effects in `.then()` (toasts, redirects, analytics) fire on a page the user already left.

React 18 removed the old "Can't perform a React state update on an unmounted component" warning because setting state there is harmless by itself, but the race conditions and side effects are real bugs.

## How to fix it

1. Create an `AbortController` in the effect and pass its `signal` to `fetch`.
2. Abort in the cleanup; it runs on unmount and before the effect re-runs with new deps.
3. Ignore `AbortError` in the catch.
4. Pass the signal through your API client (axios also supports `signal`).

```jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router";

export function UserPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setUser(null);
    setError(null);

    fetch(`/api/users/${id}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setUser)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      });

    return () => controller.abort(); // unmount or id change cancels the old request
  }, [id]);

  if (error) return <p role="alert">Could not load user.</p>;
  if (!user) return <p>Loading...</p>;
  return <h1>{user.name}</h1>;
}
```

If the API cannot be aborted (an SDK without signal support), use an ignore flag:

```jsx
useEffect(() => {
  let ignore = false;
  sdk.getUser(id).then((u) => { if (!ignore) setUser(u); });
  return () => { ignore = true; };
}, [id]);
```

With TanStack Query, `queryFn: ({ signal }) => fetch(url, { signal })` cancels automatically when no component uses the query anymore, and results are keyed by `id`, so races disappear.

## How to verify

- Network tab with "Slow 3G": navigate away mid-request; the request shows as `(canceled)`.
- Switch quickly between `/users/1` and `/users/2`: the page always shows the last selected user.
- Strict Mode dev: the first mount's request is cancelled by the simulated unmount, which proves the cleanup works.

## Follow-up questions

- **Does aborting stop the server work?** No; it closes the connection on the client. For expensive server jobs, add a cancel endpoint or idempotency.
- **What about mutations (POST) when leaving the page?** Usually let them finish; do not abort a payment. Just avoid UI side effects after unmount.
- **How do React Router loaders handle this?** Each loader receives `request.signal`, which aborts when the navigation is interrupted.

## Quick recap

- Async work outlives the component unless you cancel it.
- Abort in the effect cleanup with `AbortController`.
- Use an ignore flag when cancellation is impossible.
- Cleanup also prevents race conditions on param changes.
