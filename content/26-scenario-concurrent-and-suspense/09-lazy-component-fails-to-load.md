---
title: "A lazy-loaded component fails to load. How should the UI behave?"
tags: ["react-lazy", "error-boundary", "suspense", "code-splitting", "resilience"]
difficulty: "hard"
---

## Short answer

Suspense only handles *waiting*. A failed `import()` throws an error that must be caught by an **Error Boundary** placed around the Suspense boundary. The UI should show a small, local error with a **Retry** button (not a blank page), retry transient network failures automatically a couple of times, and, if the chunk is missing because a new version was deployed, offer a full page reload. Note that `React.lazy` caches the rejected result, so a real retry needs a **fresh `lazy()` instance**.

## Why it happens

```text
lazy(() => import("./Chart"))
   ├─ pending   → nearest <Suspense> shows fallback
   ├─ resolved  → render Chart
   └─ rejected  → error thrown during render → nearest Error Boundary
                  (no boundary → React unmounts the whole root → blank screen)
```

Common causes:

- Flaky or offline network on mobile.
- **Deploy skew**: the user's old HTML references `chunk-abc123.js`, which the new deploy removed (`ChunkLoadError` / "Failed to fetch dynamically imported module").
- Ad blockers or CDN errors.

Resetting the Error Boundary alone isn't enough. The same `lazy` object re-throws its cached error, so the retry has to call `import()` again.

## How to fix it

1. Wrap the lazy component in an Error Boundary + Suspense pair, close to the widget.
2. Retry the import automatically with backoff.
3. On manual retry, recreate the lazy component.
4. For chunk errors after a deploy, suggest reloading (guarded, so you don't loop).

```jsx
import { lazy, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

function retryImport(factory, retries = 2, delay = 500) {
  return factory().catch((err) =>
    retries > 0
      ? new Promise((r) => setTimeout(r, delay)).then(() =>
          retryImport(factory, retries - 1, delay * 2)
        )
      : Promise.reject(err)
  );
}

const loadReport = () => retryImport(() => import("./ReportViewer"));

export default function ReportSection() {
  // Kept in state so a manual retry can swap in a brand-new lazy instance
  const [Report, setReport] = useState(() => lazy(loadReport));

  return (
    <ErrorBoundary
      onReset={() => setReport(() => lazy(loadReport))}
      fallbackRender={({ error, resetErrorBoundary }) => {
        const isChunkError = /dynamically imported module|ChunkLoadError|Loading chunk/i.test(error.message);
        return (
          <div role="alert">
            <p>We couldn't load the report.</p>
            {isChunkError ? (
              <button onClick={() => window.location.reload()}>Reload page (new version available)</button>
            ) : (
              <button onClick={resetErrorBoundary}>Retry</button>
            )}
          </div>
        );
      }}
    >
      <Suspense fallback={<ReportSkeleton />}>
        <Report />
      </Suspense>
    </ErrorBoundary>
  );
}
```

> **⚠️ Gotcha:** Error Boundaries don't catch errors in event handlers or async code outside rendering. They do catch lazy and `use()` rejections, because those surface during render.

> **💡 Interview tip:** Mention prevention, too: keep old chunks on the CDN for a while after a deploy, and prefetch critical chunks on hover or idle so failures happen less often.

## How to verify

- DevTools → Network → block the chunk's URL: the local error UI appears and the rest of the app keeps working.
- Unblock and click Retry: a new request fires and the component renders.
- Simulate offline mode, then go online: the automatic retries recover.
- Log errors from the boundary's `onError` to your monitoring tool (e.g. Sentry).

## Follow-up questions

- **Why not catch the error inside the lazy factory and return a fallback component?** You can (`.catch(() => ({ default: ErrorStub }))`), but then you lose the boundary's reset flow and error reporting.
- **Where should the boundary go?** Around the feature, not the root; a failed chart shouldn't take down navigation.
- **What about Next.js?** `error.js` files are route-level Error Boundaries with a `reset()` function; `next/dynamic` builds on `lazy`.

## Quick recap

- Suspense handles loading; an Error Boundary handles failure.
- Show local, actionable error UI with Retry.
- `lazy` caches rejections, so recreate it (or retry inside the factory).
- Reload for deploy-skew chunk errors, guarded against loops.
