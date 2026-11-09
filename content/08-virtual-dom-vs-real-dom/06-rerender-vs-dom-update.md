---
title: "What is the difference between re-rendering and DOM updates?"
tags: ["re-render", "dom", "commit", "performance"]
difficulty: "medium"
---

## Short answer

Re-rendering means React calls your component function again to get a new element description; it happens in JavaScript, in the render phase. A DOM update is the actual change to the browser's nodes, which happens in the commit phase, and only when reconciliation found a difference. Many re-renders produce zero DOM updates, so "this component re-rendered" doesn't mean the page changed.

## Explanation

| | Re-render | DOM update |
|---|---|---|
| What runs | Your component function and its hooks | `react-dom` host operations (`textContent`, `setAttribute`, `insertBefore`…) |
| Phase | Render | Commit |
| Interruptible | Yes, for concurrent lanes | No |
| Cost | JS execution + diffing | Possible style recalculation, layout, paint |
| Visible to user | No | Yes |
| How to observe | React DevTools Profiler, `console.log` in body | DevTools Elements flashing, paint flashing |

```text
Click
  -> re-render Parent, Child A, Child B      (3 component calls)
  -> reconcile: only Child B's <span> text differs
  -> commit: 1 DOM write (span.textContent)
  -> browser paints
```

### Why the distinction matters

- **Performance diagnosis:** If the app feels slow, check whether time goes into rendering (too many or too expensive component calls) or into the DOM (layout thrashing, huge node counts). The fixes differ.
- **Render-phase fixes:** `memo`, `useMemo`, moving state down, children-as-props, React Compiler, virtualization.
- **DOM-phase fixes:** fewer nodes, avoid layout-forcing reads, use `transform`/`opacity` for animation, virtualize long lists.

Analogy: re-rendering is rehearsing a speech in your head; the DOM update is actually saying the changed sentence out loud.

## Example

```jsx
import { useState } from "react";

export default function Clock() {
  const [tick, setTick] = useState(0);

  return (
    <>
      <button onClick={() => setTick((t) => t + 1)}>Tick</button>
      <Header />            {/* re-renders, DOM untouched */}
      <Counter value={tick} /> {/* re-renders, one text node updated */}
    </>
  );
}

function Header() {
  console.log("Header rendered");
  return <h1>Dashboard</h1>;
}

function Counter({ value }) {
  return <p>Ticks: {value}</p>;
}
```

Every click logs "Header rendered", but the `<h1>` DOM node is never touched.

## Common mistakes

- Optimizing every re-render. Cheap re-renders with no DOM change are usually fine; profile first.
- Assuming React DevTools' "highlight updates" shows DOM changes. It highlights renders, not DOM mutations.
- Believing a re-render recreates DOM nodes. Nodes are reused unless type or key changes.

> **💡 Interview tip:** Say "renders are cheap, commits are what users see" and mention you'd use the Profiler to measure before adding `memo`.

## Follow-up questions

- **When is a re-render actually expensive?** When a component does heavy computation, renders huge lists, or causes a cascade of thousands of child renders.
- **Can a DOM update happen without a re-render?** Not through React. Direct DOM changes via refs bypass rendering entirely.
- **Does StrictMode double rendering cause double DOM updates?** No, the extra render call is discarded; only one commit happens.

## Quick recap

- Re-render = calling components (JS).
- DOM update = commit-phase mutation of real nodes.
- Many renders end with no DOM change.
- Diagnose and optimize the two separately.
