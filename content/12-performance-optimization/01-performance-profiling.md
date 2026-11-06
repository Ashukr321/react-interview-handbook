---
title: "Performance profiling: React DevTools, flame charts, avoiding wasted renders"
tags: ["profiling", "devtools", "re-renders", "memo"]
difficulty: "medium"
---

## Short answer

I profile with the **React DevTools Profiler**: record an interaction, then read the **flame chart** (which components rendered in each commit and how long they took) and the **ranked chart** (slowest components first), with "Record why each component rendered" turned on. A **wasted render** is a component that re-rendered but produced the same output. I fix the cause (state placement, unstable props, broad Context or selectors) and then confirm with a second recording. For non-React costs I use the Chrome Performance panel.

## Explanation

Profiling is like a doctor ordering tests before prescribing medicine. `React.memo` everywhere is medicine without a diagnosis.

### Tools and what they show

| Tool | Answers |
|---|---|
| React DevTools Profiler, flame chart | Which components rendered in a commit, self vs total time, colored by cost; grey means did not render |
| Profiler, ranked chart | Slowest components in that commit |
| "Why did this render?" | Props changed (which ones), state changed, hooks changed, context changed, parent rendered |
| Highlight updates | Visual flash on every rendering component |
| Chrome Performance panel | Long tasks, scripting vs layout vs paint, INP and LCP markers |
| `<Profiler>` component | Programmatic render timings (`onRender`) for logging in staging |
| Lighthouse / Web Vitals | LCP, INP, CLS in lab and field data |

### Reading a flame chart

```text
Commit #3  (12.4 ms)
App ████████████████████████████████
  Header ██  (grey = did not render)
  Dashboard ███████████████████████
    Chart ████████████████  9.1 ms  <- hot spot, yellow/orange
    Table ██
```

Width is time; color goes from cool (fast) to warm (slow). Look for wide warm bars and for many components rendering when only one should.

### Common causes of wasted renders

- Parent state changes re-render all children.
- Inline objects/functions as props break `React.memo`.
- One Context holds everything.
- `useSelector` returns a new array/object each time.
- Keys based on index cause remounts on reorder.

### Fixes, in order

1. Move state down / lift content up with `children`.
2. Split Contexts; narrow selectors.
3. `React.memo`, `useMemo`, `useCallback` for expensive subtrees (or the React Compiler).
4. Virtualize long lists; defer heavy work with `useDeferredValue` / `useTransition`.

## Example

```jsx
import { Profiler, memo, useCallback, useState } from "react";

function onRender(id, phase, actualDuration, baseDuration) {
  // actualDuration: time spent this commit; baseDuration: cost without memoization
  if (actualDuration > 16) console.warn(`${id} ${phase} took ${actualDuration.toFixed(1)}ms`);
}

const ExpensiveList = memo(function ExpensiveList({ items, onSelect }) {
  return items.map((i) => <li key={i.id} onClick={() => onSelect(i.id)}>{i.name}</li>);
});

export function Page({ items }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const handleSelect = useCallback((id) => setSelected(id), []); // stable, so memo works

  return (
    <Profiler id="Page" onRender={onRender}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>Selected: {selected}</p>
      <ul><ExpensiveList items={items} onSelect={handleSelect} /></ul>
    </Profiler>
  );
}
```

Typing in the input no longer re-renders `ExpensiveList`, which the next Profiler recording shows as grey.

> **💡 Interview tip:** Profile a **production build** (`react-dom/profiling`) for real numbers. Development mode is much slower and StrictMode double-renders components.

## Common mistakes

- Optimizing without measuring, then adding `memo` that never skips anything.
- Profiling in development mode and treating the numbers as real.
- Confusing a re-render with a DOM update; many renders are cheap and harmless.
- Ignoring non-React costs like layout thrashing, huge images or third-party scripts.

## Follow-up questions

- **What is the difference between actualDuration and baseDuration?** `actualDuration` is time spent rendering this commit; `baseDuration` estimates rendering the whole subtree without memoization, showing how much memo saves.
- **How does React Compiler affect profiling?** It auto-memoizes, so many wasted renders disappear; DevTools marks compiled components with a "Memo ✨" badge.
- **How do you catch regressions?** Track Web Vitals (INP, LCP) in production and add performance budgets in CI with Lighthouse.

## Quick recap

- Measure first with the Profiler flame and ranked charts.
- Turn on "why did this render" to find the cause.
- Fix structure before memoizing.
- Verify with a second recording on a production build.
