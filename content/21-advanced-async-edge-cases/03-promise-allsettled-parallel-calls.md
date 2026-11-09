---
title: "Does React use Promise.allSettled() for parallel API calls? How does that work internally?"
tags: ["promises", "async", "parallel-requests", "javascript"]
difficulty: "medium"
---

## Short answer

No. React itself doesn't make or coordinate your API calls, so it doesn't use `Promise.allSettled()` for them. Fetching is plain JavaScript that **you** write (or a library like TanStack Query does). `Promise.allSettled()` is a JavaScript built-in that waits for every promise to finish, success or failure, and returns an array of `{ status, value | reason }` in the original order. You use it in React when you want parallel calls where one failure shouldn't throw away the others.

## Explanation

Analogy: you send three friends to buy different groceries. `Promise.all` is "if anyone comes back empty-handed, cancel dinner" (you stop waiting, though the others still finish their trips). `Promise.allSettled` is "wait until everyone's back, then cook with whatever we got".

### The four combinators

| Method | Resolves when | Rejects when | Use for |
|---|---|---|---|
| `Promise.all` | All fulfill | Any rejects (fail fast) | All results required |
| `Promise.allSettled` | All settle | Never (for valid input) | Independent results, partial success OK |
| `Promise.race` | First settles | First settles with rejection | Timeouts |
| `Promise.any` | First fulfills | All reject (`AggregateError`) | Fastest mirror / fallback sources |

### How `allSettled` works internally (spec behavior)

```text
allSettled([p1, p2, p3])
  create result array of length 3, remaining = 3
  for each item i:
     Promise.resolve(item).then(
        value  => results[i] = { status: "fulfilled", value },  remaining--
        reason => results[i] = { status: "rejected",  reason }, remaining--
     )
     when remaining hits 0 -> resolve(results)
```

- Every request starts **before** `allSettled` is called; it only waits. Parallelism comes from creating all promises up front.
- Results keep input order, not completion order.
- Non-promise values are wrapped with `Promise.resolve`.

### Where React touches promises

React only cares about promises in specific APIs: `use(promise)` and Suspense, `React.lazy`, async Actions in `startTransition`, and Server Components that `await`. Even there it tracks each thenable separately; it doesn't batch them with `allSettled`. Sibling components that suspend under Suspense boundaries load independently, which is a similar "partial success" effect at the UI level.

## Example

```jsx
import { useEffect, useState } from "react";

function Dashboard() {
  const [data, setData] = useState({ profile: null, orders: null, alerts: null });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const get = (url) =>
      fetch(url, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json();
      });

    Promise.allSettled([get("/api/profile"), get("/api/orders"), get("/api/alerts")])
      .then(([profile, orders, alerts]) => {
        if (controller.signal.aborted) return;
        const pick = (r) => (r.status === "fulfilled" ? r.value : null);
        setData({ profile: pick(profile), orders: pick(orders), alerts: pick(alerts) });
        setErrors({
          profile: profile.status === "rejected" ? profile.reason : null,
          orders: orders.status === "rejected" ? orders.reason : null,
          alerts: alerts.status === "rejected" ? alerts.reason : null,
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      {errors.profile ? <p role="alert">Profile unavailable</p> : <Profile data={data.profile} />}
      {errors.orders ? <p role="alert">Orders unavailable</p> : <Orders data={data.orders} />}
      {errors.alerts ? null : <Alerts data={data.alerts} />}
    </>
  );
}
```

With TanStack Query, `useQueries({ queries: [...] })` runs queries in parallel with independent loading and error states per query, which is usually cleaner than manual `allSettled`.

## Common mistakes

- Saying React runs fetches in parallel for you. Parallelism depends on when you create the promises.
- `await`ing requests one after another (`await a(); await b();`), creating a waterfall.
- Using `Promise.all` for independent widgets, so one failed widget blanks the whole page.
- Forgetting that `fetch` doesn't reject on HTTP errors; without a `res.ok` check, `allSettled` reports them as fulfilled.

## Follow-up questions

- **Does `Promise.all` cancel the other requests when one fails?** No. Promises aren't cancellable; use an `AbortController` to stop the rest.
- **How do you limit concurrency for 100 requests?** Use a small pool (e.g. `p-limit`) instead of firing all at once.
- **How do Server Components fetch in parallel?** Start promises first, then `await Promise.all([...])`, or pass unawaited promises to components wrapped in Suspense.

## Quick recap

- React doesn't use `allSettled` for your calls; it's plain JavaScript.
- `allSettled` waits for all, never rejects, keeps order.
- `all` fails fast; `allSettled` allows partial success.
- Start promises together to get parallelism.
- Check `res.ok`, and abort on unmount.
