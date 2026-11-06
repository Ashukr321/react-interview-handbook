---
title: "A critical UI feature is failing during peak traffic — how do you mitigate the issue?"
tags: ["incident", "resilience", "feature-flags", "retries"]
difficulty: "hard"
---

## Short answer

First I stop the bleeding: confirm impact in monitoring, then use a feature flag, rollback or degraded mode so users can still complete the core task. Then I find the root cause (usually a backend timing out, rate limits, or the client hammering the API with retries) and make the frontend resilient: timeouts, retries with backoff and jitter, request deduplication, caching, and graceful fallbacks. A blameless post-mortem follows.

## Why it happens

- **Backend overload**: APIs slow down or return 429/503 under load, and the UI has no fallback.
- **Retry storms**: every client retries instantly, multiplying the load.
- **Thundering herd**: many components or tabs fetch the same data at the same moment.
- **No timeouts**: spinners hang forever and users refresh, adding more load.
- **Recent deploy** that only breaks at scale (uncached endpoint, N+1 requests).
- **CDN/third-party limits**: an SDK or script is slow and blocks rendering.

## How to fix it

### 1. Mitigate now

```text
Alert fires -> check dashboards (errors, latency, release)
   |-- caused by recent deploy?  -> roll back
   |-- one feature failing?      -> kill-switch flag OFF / fallback UI
   |-- backend overloaded?       -> serve cached/static data, queue requests
Communicate status to support + users
```

### 2. Make requests resilient

```js
async function fetchWithRetry(url, { retries = 3, timeout = 5000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = 2 ** attempt * 300 + Math.random() * 300; // backoff + jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

With TanStack Query, the same ideas are built in: deduplication, `retry`, `retryDelay`, `staleTime` and showing cached data while refetching.

### 3. Degrade gracefully

```jsx
function Recommendations() {
  const { data, isError } = useQuery({
    queryKey: ["recs"],
    queryFn: () => fetchWithRetry("/api/recs"),
    staleTime: 60_000,
  });
  if (isError) return <PopularProducts />; // static fallback, page still works
  return <ProductGrid items={data ?? []} />;
}
```

Wrap non-critical widgets in Error Boundaries so one failure does not blank the page. Disable buttons while submitting and use idempotency keys so double clicks do not double-charge.

> **💡 Interview tip:** Interviewers want to hear "mitigate first, debug second". Users care that checkout works, not why it broke.

## How to verify

- Error rate and latency return to baseline on dashboards.
- Load test (k6, Artillery) the fixed flow at peak plus margin.
- Chaos test: block the API in staging and confirm the fallback UI appears.

## Follow-up questions

- **Why add jitter to retries?** So thousands of clients do not retry at exactly the same moment.
- **What is a circuit breaker?** After repeated failures, stop calling the service for a while and use the fallback directly.
- **How do feature flags help?** You can turn off a broken feature in seconds without a deploy.

## Quick recap

- Mitigate first: rollback, kill switch, degraded mode.
- Timeouts, backoff with jitter, deduplication and caching protect the backend.
- Error Boundaries and fallbacks keep the rest of the page working.
- Load test and post-mortem to prevent a repeat.
