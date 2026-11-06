---
title: "How do you send multiple API requests on a single button click?"
tags: ["async", "promise-all", "parallel", "fetch"]
difficulty: "easy"
---

## Short answer

If the requests are independent, start them all at once and wait with `Promise.all` (fail-fast) or `Promise.allSettled` (get every result). That makes the total time roughly equal to the slowest request instead of the sum of all. If one request needs data from another, `await` them in sequence. Track loading state, disable the button while in flight, and cancel with `AbortController` if the component unmounts.

## Explanation

Ordering three dishes at a restaurant: you do not wait for the soup to arrive before ordering the main course. You order everything at once, and dinner is ready when the slowest dish is done.

### Choosing a strategy

| Need | Tool | Behavior |
|---|---|---|
| All must succeed | `Promise.all` | Rejects on first failure |
| Show whatever succeeded | `Promise.allSettled` | Never rejects; each result has `status` |
| First one wins | `Promise.race` / `Promise.any` | Timeouts, mirror servers |
| B depends on A | Sequential `await` | Waterfall, slower |
| Many requests (100+) | Batches / concurrency limit | Avoid overwhelming the server |

### Timing

```text
Sequential:  [--A--][----B----][-C-]          total = A + B + C
Parallel:    [--A--]
             [----B----]
             [-C-]                            total = max(A, B, C)
```

### Practical concerns

- Disable the button (or ignore clicks) while loading to avoid duplicate submissions.
- Use one `AbortController` for the whole batch.
- With TanStack Query, `useQueries` or several `useMutation` calls give you caching and retries for free.

## Example

```jsx
import { useEffect, useRef, useState } from "react";

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json();
}

export function DashboardLoader() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleClick() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const [user, orders, notifications] = await Promise.all([
        getJson("/api/user", controller.signal),
        getJson("/api/orders", controller.signal),
        getJson("/api/notifications", controller.signal),
      ]);
      setData({ user, orders, notifications });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Loading…" : "Load dashboard"}
      </button>
      {error && <p role="alert">{error}</p>}
      {data && <p>{data.orders.length} orders for {data.user.name}</p>}
    </div>
  );
}
```

## Common mistakes

- Writing `await a(); await b(); await c();` for independent calls, creating an accidental waterfall.
- Using `forEach` with async callbacks; it does not wait. Use `Promise.all(items.map(...))`.
- Forgetting that `fetch` does not reject on 404/500; check `res.ok`.
- Calling `setState` three times from three `.then`s, causing extra renders and inconsistent intermediate UI.

## Follow-up questions

- **Does `Promise.all` cancel the other requests when one fails?** No. They keep running; abort them with a shared `AbortController` if needed.
- **How do you limit concurrency for 500 requests?** Process in chunks or use a small pool (e.g. `p-limit`) so only N run at a time.
- **Is this better done on the server?** Often yes: a single aggregated endpoint (BFF or GraphQL) avoids several round trips from mobile networks.

## Quick recap

- Independent requests: `Promise.all` or `Promise.allSettled`.
- Dependent requests: sequential `await`.
- Disable the button and cancel with `AbortController`.
- Check `res.ok`; fetch only rejects on network errors.
