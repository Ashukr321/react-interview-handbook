---
title: "Your dashboard has 100+ components. Updating one widget causes the entire dashboard to re-render. How would you solve it?"
tags: ["re-renders", "state-management", "context", "memo"]
difficulty: "hard"
---

## Short answer

The whole dashboard re-renders because the changing state lives too high (in the dashboard root or a single big Context), so every child is part of the update. I move each widget's state into the widget, or into a store with selectors so a widget subscribes only to its own slice, split large contexts, and wrap widgets in `memo` with stable props. After the fix, updating one widget renders only that widget.

## Why it happens

```text
Dashboard (holds ALL widget data in one useState / one Context)
  |-- WidgetA   re-renders
  |-- WidgetB   re-renders
  |-- ... 100+  re-render
  (only WidgetA's data actually changed)
```

- Parent state change -> React re-renders all descendants by default.
- A Context value changes -> every consumer re-renders, even if it uses an unrelated field.
- New object/array/function props each render break `memo`.
- One `useSelector` returning a new object every time (`state => ({...})`) forces renders.

## How to fix it

### 1. Colocate state

If a widget's filters, open state or form data are only used inside it, keep them in the widget. A state change then only re-renders that subtree.

### 2. Use a store with selectors for shared data

```jsx
import { create } from "zustand";

const useDashboard = create((set) => ({
  widgets: {}, // { [id]: data }
  updateWidget: (id, data) =>
    set((s) => ({ widgets: { ...s.widgets, [id]: data } })),
}));

const Widget = memo(function Widget({ id }) {
  const data = useDashboard((s) => s.widgets[id]); // only this widget's slice
  const updateWidget = useDashboard((s) => s.updateWidget);
  return <Card data={data} onRefresh={() => updateWidget(id, refresh(data))} />;
});

function Dashboard({ ids }) {
  return ids.map((id) => <Widget key={id} id={id} />);
}
```

Redux Toolkit works the same way: normalize with `createEntityAdapter` and select `state.widgets.entities[id]`. Because unchanged widgets keep the same object reference, their selectors return the same value and they skip rendering.

### 3. Split contexts

```jsx
<FiltersContext.Provider value={filters}>
  <LayoutContext.Provider value={layout}>
    {children}
  </LayoutContext.Provider>
</FiltersContext.Provider>
```

Separate rarely-changing values (theme, user) from fast-changing ones, and memoize provider values.

### 4. Stabilize props

Pass IDs instead of whole objects where possible, use `useCallback` for handlers passed to memoized children (or rely on the React Compiler), and avoid inline `style={{}}` objects on memoized components.

> **⚠️ Gotcha:** `memo` alone will not help if the parent passes `data={widgets[id]}` from a freshly copied array or a new callback each render. Fix the props, not just the wrapper.

## How to verify

- React DevTools "Highlight updates when components render": only the updated widget flashes.
- Profiler commit shows 1 component instead of 100+.
- Interaction time (INP) for widget updates drops.

## Follow-up questions

- **Why does Context cause this?** Any change to the provider's value re-renders all consumers; there are no built-in selectors.
- **What does normalizing state mean?** Storing items in an object keyed by ID so one update does not change references for others.
- **Can you use `useSyncExternalStore` directly?** Yes; it is what Zustand and React-Redux use to support fine-grained subscriptions safely.

## Quick recap

- The cause is state living too high or in one big Context.
- Colocate local state; use selector-based stores for shared state.
- Normalize data so unchanged widgets keep the same references.
- `memo` + stable props, then confirm with Highlight updates.
