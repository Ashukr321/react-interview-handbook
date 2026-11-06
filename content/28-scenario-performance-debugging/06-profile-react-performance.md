---
title: "How would you profile a React application's performance?"
tags: ["profiler", "devtools", "lighthouse", "web-vitals"]
difficulty: "medium"
---

## Short answer

I profile at three levels: the React DevTools Profiler for component render cost and reasons, the Chrome Performance panel for main-thread work, layout and paint, and Lighthouse plus real-user Web Vitals for loading and responsiveness. I always use a production (or profiling) build with CPU throttling, record one specific interaction at a time, and compare before and after each change.

## Why it happens

"Slow" can mean slow load, slow interaction, or janky scrolling, and each needs a different tool. Profiling in development mode or on a fast laptop gives misleading numbers, so the method matters as much as the tool.

## How to fix it

### 1. Pick the right tool

| Question | Tool |
| --- | --- |
| Which components render, why, how long? | React DevTools Profiler |
| What blocks the main thread? | Chrome Performance panel |
| How fast does it load? | Lighthouse, WebPageTest, Network tab |
| What do real users experience? | `web-vitals` / RUM, CrUX |
| What is in my bundle? | Bundle analyzer |

### 2. React DevTools Profiler workflow

```text
1. Settings -> "Record why each component rendered"
2. Record -> perform ONE interaction -> Stop
3. Commit bar chart: pick the tallest commits
4. Flamegraph: wide/yellow bars = slow components
5. Ranked: slowest components first
6. Hover: "Why did this render?" (props, state, hooks, parent)
```

### 3. Chrome Performance panel workflow

- CPU throttling 4x-6x, network "Fast 4G".
- Record the interaction; look at the **Interactions** track for INP-like timing.
- Expand long tasks (red corner) -> Bottom-Up tab for heaviest functions.
- Watch for purple Layout blocks and "Forced reflow" warnings.

### 4. Programmatic profiling

```jsx
import { Profiler } from "react";

function onRender(id, phase, actualDuration, baseDuration) {
  if (actualDuration > 16) {
    console.warn(`${id} ${phase} took ${actualDuration.toFixed(1)}ms`);
  }
}

export default function App() {
  return (
    <Profiler id="ProductGrid" onRender={onRender}>
      <ProductGrid />
    </Profiler>
  );
}
```

`actualDuration` is the time spent rendering this commit; `baseDuration` estimates the cost without memoization.

### 5. Field data

```js
import { onINP, onLCP, onCLS } from "web-vitals";
[onINP, onLCP, onCLS].forEach((fn) => fn((m) => navigator.sendBeacon("/vitals", JSON.stringify(m))));
```

> **⚠️ Gotcha:** Development builds are much slower and StrictMode double-renders. Profile a production build; for component timings in production, alias `react-dom` to its profiling build.

## How to verify

- Same recorded interaction shows shorter commits and no long tasks after the fix.
- Lighthouse score and lab LCP/TBT improve; field p75 INP/LCP improve over days.
- Keep a baseline screenshot or trace to compare against.

## Follow-up questions

- **What is a commit in the Profiler?** One batch of changes React applied to the DOM; each bar is one commit.
- **What is TBT?** Total Blocking Time: the sum of long-task time over 50 ms during load, a lab proxy for responsiveness.
- **Can you profile on a real phone?** Yes, remote debugging via `chrome://inspect` or Safari Web Inspector.

## Quick recap

- React Profiler for renders, Performance panel for the main thread, Lighthouse/RUM for load and real users.
- Production build, CPU throttling, one interaction per recording.
- `<Profiler onRender>` for programmatic timing.
- Compare before and after every change.
