---
title: "Your dashboard has 50 components. Updating one component causes many components to re-render. How will you optimize?"
tags: ["performance", "re-renders", "memo", "scenario"]
difficulty: "medium"
---

## Short answer

First I measure with the React DevTools Profiler to see **why** each component re-rendered. The usual causes are state held too high (a parent re-renders all 50 children), a single big Context, or a store subscription that selects too much. I fix the cause: move state down or split it, split Contexts, use narrow selectors, and only then add `React.memo`/`useCallback` where props are stable. The React Compiler can automate most of the memoization.

## Why it happens

A component re-renders when its own state changes, its parent re-renders, or a Context/store value it subscribes to changes. In a dashboard this commonly looks like:

```text
Dashboard (holds filters, selectedWidget, theme, liveData)
  |-- setLiveData() every 2s
  |
  +-- 50 widgets all re-render, even ones that do not use liveData
```

- **State too high**: one `useState` at the top means every update re-renders the whole tree.
- **One mega Context**: `{ user, theme, liveData }` in one provider; any change notifies every consumer.
- **Broad selectors**: `useSelector((s) => s.dashboard)` re-renders on any dashboard change.
- **Unstable props**: inline objects/functions (`style={{}}`, `onClick={() => ...}`) defeat `React.memo`.

## How to fix it

1. **Profile first.** Turn on "Record why each component rendered" in the Profiler and "Highlight updates". Find the update that fans out.
2. **Colocate state.** Move widget-specific state (hover, expanded, local filters) into the widget.
3. **Split Contexts** by update frequency: `AuthContext`, `ThemeContext`, `LiveDataContext`.
4. **Use selectors that return the minimum.** With Redux, select one widget's data by id; with Zustand, select a single field.
5. **Use composition.** Pass static widgets as `children` so the stateful parent does not re-create them.
6. **Memoize the leaves.** Wrap expensive widgets in `React.memo` and keep props stable with `useCallback`/`useMemo` (or enable the React Compiler).
7. **Defer non-urgent work.** `useDeferredValue` for heavy charts reacting to fast filters.

```jsx
import { memo } from "react";
import { useSelector, shallowEqual } from "react-redux";

// Before: every widget re-renders when anything in dashboard changes
// const data = useSelector((s) => s.dashboard);

// After: each widget subscribes only to its own slice of data
const Widget = memo(function Widget({ id }) {
  const widget = useSelector((s) => s.dashboard.widgets.byId[id]);
  return <ChartCard title={widget.title} points={widget.points} />;
});

export function Dashboard() {
  const ids = useSelector((s) => s.dashboard.widgets.allIds, shallowEqual);
  return (
    <div className="grid">
      {ids.map((id) => <Widget key={id} id={id} />)}
    </div>
  );
}
```

Splitting a provider so fast updates do not hit everything:

```jsx
<AuthProvider>
  <ThemeProvider>
    <LiveDataProvider>{/* only charts consume this */}
      <Dashboard />
    </LiveDataProvider>
  </ThemeProvider>
</AuthProvider>
```

> **💡 Interview tip:** Say "I fix the structure before I add memo." `React.memo` on 50 components with unstable props does nothing except add comparison cost.

## How to verify

- Re-run the Profiler: the commit after updating one widget should show only that widget (and its children) rendering.
- Compare commit durations before and after.
- Use "Highlight updates when components render" to visually confirm only one card flashes.
- Optional: `why-did-you-render` in development for unexpected re-renders.

## Follow-up questions

- **Does a re-render always mean a DOM update?** No. Re-render means the function ran; React only touches the DOM if the output differs. Wasted renders cost CPU, not DOM writes.
- **What does React Compiler change?** It auto-memoizes components and values at build time, so manual `useMemo`/`useCallback`/`memo` is mostly unnecessary.
- **When is memo not worth it?** For cheap components or when props change on every render anyway.

## Quick recap

- Measure with the Profiler before changing code.
- Move state down, split Contexts, select narrowly.
- Pass ids, not whole objects, and keep props stable.
- Add `React.memo` last, where profiling shows it helps.
