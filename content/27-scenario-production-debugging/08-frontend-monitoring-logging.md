---
title: "How would you implement a robust frontend monitoring and logging system?"
tags: ["monitoring", "logging", "observability", "web-vitals"]
difficulty: "hard"
---

## Short answer

I cover three signals: errors (uncaught exceptions, promise rejections, React Error Boundaries) with source maps, performance (Core Web Vitals and custom timings from real users), and user/business events. I send them in batches with context like release, route, browser and a correlation ID shared with backend logs, sample high-volume data, strip PII, and wire up dashboards and alerts on error rate and Web Vitals per release.

## Why it happens

Without monitoring, you learn about frontend bugs from angry users. Browser errors never reach server logs, minified stack traces are unreadable, and a regression on one browser or route hides inside averages. A good system answers "what broke, for whom, since which release".

## How to fix it

### 1. Architecture

```text
Browser
  |-- window.onerror / unhandledrejection
  |-- Error Boundaries (componentDidCatch)
  |-- web-vitals (LCP, INP, CLS)
  |-- custom events (checkout_failed)
  v
Logger (context + sampling + PII scrub + batching)
  v  navigator.sendBeacon / fetch keepalive
Collector (Sentry, Datadog RUM, OpenTelemetry endpoint)
  v
Dashboards + alerts (per release, route, browser)
```

### 2. Capture errors

```jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_RELEASE,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
      <Routes />
    </Sentry.ErrorBoundary>
  );
}
```

Upload source maps in CI (do not serve them publicly) so stack traces map to real code. React 19 also offers `onUncaughtError` and `onCaughtError` options on `createRoot` for reporting.

### 3. Capture performance

```js
import { onLCP, onINP, onCLS } from "web-vitals";

function send(metric) {
  const body = JSON.stringify({ name: metric.name, value: metric.value, id: metric.id, page: location.pathname });
  navigator.sendBeacon("/rum", body);
}
onLCP(send); onINP(send); onCLS(send);
```

### 4. Structured logs and context

- Levels (`debug`, `info`, `warn`, `error`), only `warn`+ shipped in production.
- Attach `release`, `route`, `userId` (hashed), `sessionId`, feature flags.
- Send a `traceparent` / request ID header so frontend errors link to backend traces.

### 5. Alerts that matter

- Error rate spike after a release, new error types, p75 LCP/INP regressions, failed checkout events.
- Route alerts to the owning team, not one shared channel.

> **⚠️ Gotcha:** Logging every click at 100% will cost a fortune and drown signal. Sample, batch and set quotas.

## How to verify

- Throw a test error in staging and confirm it arrives with a readable stack trace.
- Dashboards show Web Vitals split by route, device and release.
- Run an alert fire drill.

## Follow-up questions

- **Why `sendBeacon`?** It delivers data reliably even when the page is unloading.
- **What do Error Boundaries not catch?** Errors in event handlers, async code and SSR; catch those with try/catch and global handlers.
- **RUM vs synthetic monitoring?** RUM measures real users; synthetic runs scripted checks from fixed locations to catch outages early.

## Quick recap

- Monitor errors, performance and business events.
- Source maps, release tags and context make errors actionable.
- Batch, sample and scrub PII before sending.
- Correlate with backend traces and alert per release.
