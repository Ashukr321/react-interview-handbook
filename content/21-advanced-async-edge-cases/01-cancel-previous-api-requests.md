---
title: "How do you cancel previous API requests?"
tags: ["abortcontroller", "fetch", "async", "useeffect"]
difficulty: "medium"
---

## Short answer

Use `AbortController`. Create a controller per request, pass `controller.signal` to `fetch` (or Axios), and call `controller.abort()` when the request is no longer needed: in the `useEffect` cleanup when dependencies change or the component unmounts, or right before starting a newer request. The aborted `fetch` rejects with an `AbortError`, which you ignore instead of showing as an error.

## Explanation

Analogy: ordering a taxi, then changing your destination. You cancel the first booking instead of letting two taxis show up and arguing with the wrong driver.

### Why cancel at all

- **Race conditions**: response for an old query arrives after the new one and overwrites fresh data.
- **Wasted bandwidth and server work** for results nobody will see.
- **State updates after unmount** (harmless in React 18+, but still wasted work and potential bugs in logic).

### How `AbortController` works

```text
const controller = new AbortController()
fetch(url, { signal: controller.signal })   -> request in flight
controller.abort()
   -> signal.aborted = true, "abort" event fires
   -> fetch rejects with DOMException name "AbortError"
   -> browser cancels the network request (shown as "canceled" in DevTools)
```

- A controller is **single-use**: once aborted, create a new one.
- `controller.abort(reason)` lets you pass a reason (available as `signal.reason`).
- `AbortSignal.timeout(5000)` creates a signal that aborts after a timeout; `AbortSignal.any([a, b])` combines signals.
- Axios supports `signal` too (its old `CancelToken` is deprecated). Cancelling on the client doesn't undo work the server already did, so make writes idempotent.

## Example

```jsx
import { useEffect, useState } from "react";

function UserDetails({ userId }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setError(null);
        const res = await fetch(`/api/users/${userId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setUser(await res.json());
      } catch (err) {
        if (err.name === "AbortError") return; // expected, not a real error
        setError(err);
      }
    }

    load();
    return () => controller.abort(); // runs when userId changes or on unmount
  }, [userId]);

  if (error) return <p role="alert">Failed: {error.message}</p>;
  return user ? <h2>{user.name}</h2> : <p>Loading...</p>;
}
```

Outside effects (e.g. in an event handler), keep the controller in a ref:

```jsx
const controllerRef = useRef(null);

async function search(q) {
  controllerRef.current?.abort(); // cancel the previous one
  const controller = new AbortController();
  controllerRef.current = controller;
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
    signal: controller.signal,
  });
  return res.json();
}
```

TanStack Query passes a `signal` into `queryFn`; if you forward it to `fetch`, the library aborts the request when the query becomes unused or is cancelled.

## Common mistakes

- Treating `AbortError` as a failure and showing an error toast.
- Reusing an aborted controller for the next request; it's already aborted, so the new request fails immediately.
- Forgetting the cleanup function, so StrictMode's double effect in dev sends two live requests.
- Assuming abort rolls back a POST on the server. It only stops the client from waiting.

## Follow-up questions

- **What if the API client doesn't support signals?** Use an "ignore" flag in the effect (`let ignore = false; return () => { ignore = true; }`) and skip `setState` when it's set.
- **How do you add a timeout?** `fetch(url, { signal: AbortSignal.timeout(8000) })`, or combine with a manual signal via `AbortSignal.any`.
- **Can you abort other things?** Yes. `addEventListener` accepts a `signal` option, which removes listeners on abort.

## Quick recap

- One `AbortController` per request.
- Pass `signal`, call `abort()` in cleanup or before the next request.
- Ignore `AbortError`.
- Controllers are single-use.
- Client cancel doesn't undo server work.
