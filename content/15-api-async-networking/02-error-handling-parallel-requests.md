---
title: "How do you handle errors if multiple requests are sent simultaneously?"
tags: ["async", "error-handling", "promise-allsettled", "parallel"]
difficulty: "medium"
---

## Short answer

Decide whether the requests are all-or-nothing or independent. For all-or-nothing, use `Promise.all` in a `try/catch`: the first rejection lands in `catch` and you show one error. For independent data, use `Promise.allSettled` and handle each result separately so one failing widget does not blank the whole page. Add retries for transient failures, abort the rest when appropriate, and render partial UI with per-section error states.

## Explanation

A dashboard with weather, news and stocks: if the news API is down, users still want weather and stocks. That is `allSettled`. A checkout that must reserve stock **and** charge the card is all-or-nothing, which is `Promise.all` (and real atomicity belongs on the server).

### `Promise.all` vs `Promise.allSettled`

| | `Promise.all` | `Promise.allSettled` |
|---|---|---|
| On one failure | Rejects immediately | Waits for all |
| Result | Array of values | `{ status, value }` or `{ status, reason }` |
| Other requests | Keep running (abort manually) | All finish |
| Best for | Dependent / atomic data | Independent widgets |

### Error categories to handle

- **Network error / timeout**: retry with exponential backoff.
- **4xx** (bad input, 401, 403, 404): do not retry; show a message or redirect.
- **5xx / 429**: retry a limited number of times, respecting `Retry-After`.
- **Aborted**: ignore silently.

### In React

- Store per-request state, or use TanStack Query's `useQueries`, which gives each query its own `error`, `isLoading` and retry logic.
- Use an error boundary for unexpected render errors, but handle expected API errors in state.

## Example

```jsx
import { useEffect, useState } from "react";

const endpoints = { weather: "/api/weather", news: "/api/news", stocks: "/api/stocks" };

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function Dashboard() {
  const [results, setResults] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const keys = Object.keys(endpoints);

    Promise.allSettled(keys.map((k) => getJson(endpoints[k], controller.signal))).then((settled) => {
      if (controller.signal.aborted) return;
      const next = {};
      settled.forEach((r, i) => {
        next[keys[i]] = r.status === "fulfilled" ? { data: r.value } : { error: r.reason.message };
      });
      setResults(next);
    });

    return () => controller.abort();
  }, []);

  return (
    <div>
      {Object.keys(endpoints).map((key) => (
        <section key={key}>
          <h2>{key}</h2>
          {!results[key] && <p>Loading…</p>}
          {results[key]?.error && <p role="alert">Could not load {key}.</p>}
          {results[key]?.data && <pre>{JSON.stringify(results[key].data, null, 2)}</pre>}
        </section>
      ))}
    </div>
  );
}
```

All-or-nothing variant:

```js
try {
  const [cart, profile] = await Promise.all([getJson("/api/cart", signal), getJson("/api/profile", signal)]);
  // use both
} catch (err) {
  controller.abort(); // stop the request that is still running
  showToast("Could not load checkout. Please retry.");
}
```

## Common mistakes

- Using `Promise.all` for independent widgets, so one failure hides everything.
- Catching inside each promise and returning `undefined`, which silently hides errors in `Promise.all`.
- Retrying 4xx errors, or retrying without a limit or backoff.
- Setting state after unmount or after a newer request finished (race conditions).

## Follow-up questions

- **How do you retry with backoff?** Wait `base * 2^attempt` ms plus random jitter between attempts, capping the attempts at around 3.
- **What about `Promise.any`?** It resolves with the first success and only rejects (with `AggregateError`) if all fail; useful for redundant mirrors.
- **How do you show a single toast for many failures?** Collect rejected results from `allSettled` and summarize them in one message.

## Quick recap

- All-or-nothing: `Promise.all` + `try/catch`.
- Independent: `Promise.allSettled` + per-section UI.
- Retry only transient errors, with backoff.
- Abort leftovers and guard against stale updates.
