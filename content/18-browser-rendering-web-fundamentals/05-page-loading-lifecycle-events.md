---
title: "What events can we use when a website is loading? An in-depth overview of CRP"
tags: ["browser", "events", "lifecycle", "crp", "performance"]
difficulty: "medium"
---

## Short answer

The main page lifecycle events are `readystatechange` (`document.readyState` goes `loading` → `interactive` → `complete`), `DOMContentLoaded` (HTML parsed and deferred scripts run), and `load` (all resources including images and iframes finished). When leaving or hiding the page you have `visibilitychange`, `pagehide`, `pageshow` and `beforeunload`. Mapped onto the Critical Rendering Path, `DOMContentLoaded` marks the end of DOM construction and `load` the end of all resource loading.

## Explanation

Think of opening a shop. `interactive`/`DOMContentLoaded` is when the shelves are in place and staff can work. `load` is when every delivery, including the slow poster for the window (images), has arrived. `visibilitychange` is customers stepping out the door, and `beforeunload` is asking "are you sure you want to leave without paying?"

### Timeline mapped to the CRP

```text
navigation starts
  │ readyState = "loading"   → HTML parsing, DOM building, CSSOM, sync scripts
  │ (first paint / FCP can happen here once CSSOM is ready)
  ▼
readyState = "interactive"   → DOM complete; deferred and module scripts run
  ▼
DOMContentLoaded             → safe to query the whole DOM
  ▼ images, iframes, async resources still loading (LCP often happens here)
readyState = "complete"
  ▼
load (window)                → every subresource finished
  ...
visibilitychange → hidden    → user switched tab or minimized (save state here)
pagehide / beforeunload      → user navigating away
```

### Events reference

| Event | Target | Fires when | Typical use |
|---|---|---|---|
| `readystatechange` | `document` | `readyState` changes | Generic hook on load stages |
| `DOMContentLoaded` | `document` | DOM parsed, deferred scripts done | Initialize UI that needs the DOM |
| `load` | `window` | All resources loaded | Measuring, non-critical work |
| `load` / `error` | `img`, `script`, `link` | That resource finished or failed | Fallback images, script loading |
| `pageshow` | `window` | Page shown, including from back/forward cache (`persisted: true`) | Refresh stale data |
| `visibilitychange` | `document` | Tab hidden or visible | Pause video, flush analytics |
| `pagehide` | `window` | Page being unloaded or put in bfcache | Final cleanup |
| `beforeunload` | `window` | Before leaving | Warn about unsaved changes |
| `unload` | `window` | Leaving | Deprecated; breaks bfcache, avoid |

### Notes

- `async` scripts may run before or after `DOMContentLoaded`; `defer` scripts always run before it.
- `visibilitychange` to `hidden` is the most reliable "last chance" event on mobile; use `navigator.sendBeacon` for analytics.
- In React, components mount after the bundle runs, usually after `DOMContentLoaded`, so you rarely need these events except `visibilitychange`, `beforeunload` and `pageshow`.
- For performance data, prefer `PerformanceObserver` (LCP, CLS, INP) or the `web-vitals` library.

## Example

```jsx
import { useEffect } from "react";

export function useUnsavedChangesWarning(isDirty) {
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; // legacy browsers need this to show the dialog
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
}

export function usePageVisibility(onHidden) {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") onHidden();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [onHidden]);
}

// usage: flush analytics when the tab is hidden
// usePageVisibility(() => navigator.sendBeacon("/api/analytics", JSON.stringify(queue)));
```

## Common mistakes

- Using `unload` for analytics; it is unreliable on mobile and prevents the back/forward cache.
- Adding a `DOMContentLoaded` listener after it already fired; check `document.readyState` first.
- Doing heavy work in `beforeunload`; browsers only allow a generic confirmation dialog.
- Confusing `DOMContentLoaded` with "everything is visible"; images and fonts may still be loading.

## Follow-up questions

- **How do you run code whether or not the DOM is ready?** `if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();`
- **What is the back/forward cache?** The browser keeps the whole page in memory for instant back navigation; `pageshow` with `event.persisted === true` tells you it was restored.
- **Which event matches "first paint"?** None directly; use `PerformanceObserver` with `paint` and `largest-contentful-paint` entries.

## Quick recap

- `loading` → `interactive` (`DOMContentLoaded`) → `complete` (`load`).
- `defer` scripts run before `DOMContentLoaded`.
- Use `visibilitychange` and `pagehide`, not `unload`.
- `beforeunload` for unsaved-changes warnings only.
