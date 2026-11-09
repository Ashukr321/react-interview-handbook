---
title: "What challenges have you faced when building for large user traffic?"
tags: ["scalability", "traffic", "caching", "resilience"]
difficulty: "hard"
---

## Short answer

The main challenges I see under heavy traffic are a backend overloaded by too many client requests, slow pages for users on weak devices and networks, cache problems after deploys, third-party scripts failing at scale, and visibility: knowing what broke for whom. I handle them with CDN and HTTP caching, request deduplication and backoff, graceful fallbacks, small bundles and server rendering, safe deploys with flags, and real-user monitoring.

## Why it happens

At small scale, inefficiencies are invisible. At large scale they multiply:

- **Request amplification**: 1 extra API call per page x 1 million visits = 1 million extra calls. Polling, duplicate fetches and instant retries can take down the backend.
- **Thundering herd**: a sale or push notification sends everyone at once; caches expire at the same moment.
- **Device diversity**: a large audience includes low-end Android phones on 3G where a 2 MB bundle is very slow.
- **Deploy issues**: users with old HTML request JS chunks that no longer exist (`ChunkLoadError`).
- **Third parties**: an analytics or chat script that is slow at peak blocks the page.
- **Rare bugs become common**: a 0.1% error is thousands of users a day.

## How to fix it

### 1. Cache aggressively at every layer

```text
Browser cache -> CDN edge -> API cache (Redis) -> database
  hashed assets: Cache-Control: public, max-age=31536000, immutable
  HTML:          short max-age + stale-while-revalidate
  API (client):  TanStack Query staleTime, deduplication
```

### 2. Protect the backend from the client

```jsx
const { data } = useQuery({
  queryKey: ["product", id],
  queryFn: () => fetchProduct(id),
  staleTime: 60_000,                  // no refetch storm on every mount
  retry: 3,
  retryDelay: (n) => Math.min(1000 * 2 ** n, 15_000) + Math.random() * 500,
});
```

Pause polling in hidden tabs, debounce search, and use idempotency keys on submits.

### 3. Survive deploys

Keep old hashed chunks on the CDN for a while after a deploy, and catch chunk load failures:

```jsx
const Page = lazy(() =>
  import("./Page").catch(() => {
    window.location.reload(); // fetch fresh HTML with new chunk names
    return new Promise(() => {});
  })
);
```

### 4. Degrade gracefully

Error Boundaries around non-critical widgets, static fallbacks (popular items instead of personalized ones), kill-switch feature flags, and third-party scripts loaded `async` or after interaction.

### 5. Observe

RUM for Web Vitals by device and region, error tracking per release, and load tests (k6) before big events.

> **💡 Interview tip:** Use the STAR format: a real event (sale, launch), the problem (API 503s), what you did (cache plus backoff plus fallback), and the measured result.

## How to verify

- Load test at expected peak plus margin; error rate and p95 latency stay within targets.
- CDN cache hit ratio is high (often 90%+ for static assets).
- RUM shows stable p75 LCP/INP during peak.

## Follow-up questions

- **What is `stale-while-revalidate`?** Serve the cached response immediately while fetching a fresh one in the background.
- **How do you avoid cache stampedes?** Staggered expiry, request coalescing at the CDN, and serving stale content during revalidation.
- **Why add jitter to retries?** So clients do not retry in sync and create new spikes.

## Quick recap

- Small inefficiencies multiply with traffic.
- Cache at browser, CDN and API layers.
- Deduplicate, back off and debounce to protect the backend.
- Handle deploy chunk errors, degrade gracefully, monitor real users.
