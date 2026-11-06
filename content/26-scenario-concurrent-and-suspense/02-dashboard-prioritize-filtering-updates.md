---
title: "A dashboard performs expensive filtering. How would you prioritize updates?"
tags: ["usetransition", "starttransition", "concurrent", "dashboard", "priorities"]
difficulty: "medium"
---

## Short answer

Split each interaction into an **urgent** part (the control's visual feedback: the selected chip, checkbox or dropdown value) and a **non-urgent** part (re-filtering and re-rendering the widgets). Update the urgent state normally, and wrap the expensive state update in `startTransition` from `useTransition`. React then renders the filtered dashboard at lower priority, keeps the controls responsive, shows the old data with an `isPending` indicator, and discards stale renders when the user changes filters again.

## Why it happens

By default, every `setState` from an event is urgent (synchronous). If one click sets a filter that ten widgets depend on, React must finish rendering all ten before the click's own feedback paints, so the UI feels frozen.

```text
Urgent lane:      checkbox ticks ✔ ─► paint immediately
Transition lane:  widgets re-filter ─► time-sliced ─► commit when ready
                  new click? → interrupt + restart with latest filters
```

## How to fix it

1. Keep separate state for what the control shows and what the widgets consume, or use one state with a transition if the control can tolerate a short delay.
2. Wrap the widget-driving update in `startTransition`.
3. Use `isPending` for a subtle indicator, not a spinner that replaces content.
4. Memoize widgets (or rely on the React Compiler) so unrelated ones skip rendering.

```jsx
import { memo, useMemo, useState, useTransition } from "react";

const REGIONS = ["NA", "EU", "APAC"];

const SalesTable = memo(function SalesTable({ rows, regions }) {
  const visible = useMemo(
    () => rows.filter((r) => regions.includes(r.region)),
    [rows, regions]
  );
  return <p>{visible.length} matching orders</p>; // imagine a heavy table/chart
});

export default function Dashboard({ rows }) {
  const [checked, setChecked] = useState(REGIONS);        // urgent: UI of checkboxes
  const [appliedRegions, setAppliedRegions] = useState(REGIONS); // non-urgent: drives widgets
  const [isPending, startTransition] = useTransition();

  function toggle(region) {
    const next = checked.includes(region)
      ? checked.filter((r) => r !== region)
      : [...checked, region];
    setChecked(next);                                // paints instantly
    startTransition(() => setAppliedRegions(next));  // heavy work, low priority
  }

  return (
    <>
      {REGIONS.map((r) => (
        <label key={r}>
          <input type="checkbox" checked={checked.includes(r)} onChange={() => toggle(r)} />
          {r}
        </label>
      ))}
      <section aria-busy={isPending} style={{ opacity: isPending ? 0.6 : 1 }}>
        <SalesTable rows={rows} regions={appliedRegions} />
      </section>
    </>
  );
}
```

> **💡 Interview tip:** In React 19 you can pass an **async function** to `startTransition` (an Action), so server-side filtering like `startTransition(async () => { const data = await fetchSales(filters); setData(data); })` gets the same `isPending` handling. Note that state updates after an `await` currently need their own `startTransition` wrapper to stay in the transition.

## How to verify

- Toggle filters rapidly under 4x/6x CPU throttling: checkboxes respond instantly.
- The Profiler shows two commits per click, a fast urgent one and a later transition one.
- The Performance panel shows the transition render split into short tasks, with better INP.

## Follow-up questions

- **Why not wrap the checkbox state in the transition too?** The tick mark would lag, and transitions are meant for updates whose feedback can wait.
- **Does a transition make filtering faster?** No. It changes priority and interruptibility, not total work.
- **What if a transition suspends?** React keeps showing the previous content instead of the Suspense fallback.

## Quick recap

- Separate urgent feedback from expensive consequences.
- `startTransition` the expensive update; show `isPending` subtly.
- Stale transition renders are interrupted and restarted.
- Memoize widgets and still reduce the underlying work.
