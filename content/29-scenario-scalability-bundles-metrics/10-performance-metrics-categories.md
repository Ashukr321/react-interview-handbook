---
title: "Explain the performance metrics, classified into categories"
tags: ["performance-metrics", "web-vitals", "rum", "lighthouse"]
difficulty: "hard"
---

## Short answer

I group web performance metrics by the question they answer: **loading** (TTFB, FCP, LCP, Speed Index), **interactivity** (INP, TBT, the deprecated FID and TTI), **visual stability** (CLS), **network/server** (DNS, TCP/TLS, TTFB, transfer size, cache hit ratio), and **runtime** (long tasks, frame rate, memory, JS execution time). Each can be measured in the **lab** (Lighthouse, controlled) or the **field** (real users, RUM/CrUX), and good teams use both.

## Explanation

### 1. Loading: "Is it showing up?"

| Metric | Meaning | Good |
| --- | --- | --- |
| TTFB | Request start to first byte of response | ≤ 0.8 s |
| FCP | First text/image painted | ≤ 1.8 s |
| LCP | Largest content element painted (Core Web Vital) | ≤ 2.5 s |
| Speed Index | How quickly the visible page fills in (lab) | Lower is better |

### 2. Interactivity: "Does it respond?"

| Metric | Meaning | Good |
| --- | --- | --- |
| INP | Input to next paint, worst-ish interaction (Core Web Vital) | ≤ 200 ms |
| TBT | Sum of long-task time over 50 ms between FCP and TTI (lab) | ≤ 200 ms |
| FID | First input delay only; replaced by INP in 2024 | ≤ 100 ms |
| TTI | When the page is reliably interactive; removed from Lighthouse 10 | - |

### 3. Visual stability: "Does it stay still?"

| Metric | Meaning | Good |
| --- | --- | --- |
| CLS | Unexpected layout shift score (Core Web Vital) | ≤ 0.1 |

### 4. Network / server: "How fast is delivery?"

- DNS lookup, TCP connect, TLS handshake, TTFB (from Navigation Timing).
- Transfer size and request count; compression ratio.
- CDN cache hit ratio, API latency (p50/p95/p99), error rate.

### 5. Runtime: "Does it stay smooth?"

- Long tasks (> 50 ms) and Long Animation Frames (LoAF API).
- Frame rate / dropped frames during scroll and animation.
- JS heap size over time (memory leaks), DOM node count.
- Custom timings: time to render a route, React `<Profiler>` durations.

### Lab vs field

```text
Lab (synthetic)                    Field (RUM)
Lighthouse, WebPageTest            web-vitals, CrUX, Sentry/Datadog RUM
Controlled device + network        Real devices, networks, behaviour
Repeatable, good for CI/debug      True experience, p75 percentiles
No real INP (uses TBT)             Has INP, but noisy and delayed
```

Use lab data to debug and gate pull requests; use field data to judge success.

## Example

```js
// Field: Core Web Vitals plus custom timings and navigation breakdown
import { onLCP, onINP, onCLS, onFCP, onTTFB } from "web-vitals";

const report = (m) => navigator.sendBeacon("/rum", JSON.stringify({ name: m.name, value: m.value }));
[onLCP, onINP, onCLS, onFCP, onTTFB].forEach((fn) => fn(report));

// Custom: route render time
performance.mark("search:start");
// ... after results render
performance.mark("search:end");
performance.measure("search-render", "search:start", "search:end");

// Runtime: observe long tasks
new PerformanceObserver((list) => {
  list.getEntries().forEach((e) => report({ name: "long-task", value: e.duration }));
}).observe({ type: "longtask", buffered: true });
```

> **💡 Interview tip:** Always say which percentile you track (p75 for Web Vitals, p95/p99 for API latency) and split by device type. Averages hide slow users.

## Common mistakes

- Mixing up lab-only metrics (TBT, Speed Index) with field metrics (INP).
- Reporting averages instead of percentiles.
- Tracking only load metrics and ignoring runtime smoothness and memory.
- Still optimizing for FID or TTI, which are deprecated.

## Follow-up questions

- **Why is TBT used in Lighthouse instead of INP?** Lighthouse loads the page without real user input, so TBT estimates how blocked the main thread is.
- **What is a performance budget?** Agreed limits (e.g. JS ≤ 200 KB, LCP ≤ 2.5 s) checked in CI.
- **What are custom metrics good for?** Measuring app-specific moments like "time to first search result" that generic metrics miss.

## Quick recap

- Loading: TTFB, FCP, LCP, Speed Index.
- Interactivity: INP (field), TBT (lab); FID/TTI are legacy.
- Stability: CLS. Network: DNS/TLS/TTFB, size, cache hits.
- Runtime: long tasks, frames, memory.
- Lab to debug, field to judge, percentiles not averages.
