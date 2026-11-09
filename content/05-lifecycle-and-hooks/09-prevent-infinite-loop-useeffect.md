---
title: "How do you prevent an infinite loop in useEffect?"
tags: ["useEffect", "dependencies", "debugging", "hooks"]
difficulty: "medium"
---

## Short answer

An infinite loop happens when an effect **updates something that is also its dependency** (or runs every render), so each run triggers a render that runs it again. Prevent it by giving the effect a correct dependency array, using **functional state updates** so you do not depend on the state you set, keeping object/function dependencies **stable** (or creating them inside the effect), guarding updates with conditions, and not using an effect at all for values you can derive during render.

## Explanation

It is like a thermostat that turns on the heater every time it notices the heater turned on.

```text
render -> effect runs -> setState(new value) -> render -> effect runs -> ...
```

### The common causes and fixes

| Cause | Example | Fix |
|---|---|---|
| No dependency array | `useEffect(() => setX(x + 1))` | Add deps: `[]` or the real ones |
| Setting the state you depend on | `useEffect(() => setCount(count + 1), [count])` | Use updater `setCount(c => c + 1)` and remove `count`, or rethink: should this be an event handler? |
| Object/array dependency recreated each render | `const opts = { page }` then `[opts]` | Depend on primitives (`[page]`), create the object inside the effect, or `useMemo` |
| Function dependency recreated each render | `const load = () => ...` then `[load]` | Move the function inside the effect, or `useCallback` |
| Setting a new object/array every time | `setData({...data})` with `[data]` | Compare before setting, or restructure |
| Derived state via effect | `useEffect(() => setFull(first + " " + last), [first, last])` | Compute during render: `const full = first + " " + last` |
| Effect reads a value only to log/use it, not to react to it | Analytics with `theme` | `useEffectEvent` (React 19.2) for the non-reactive part |

### Debugging tips

- Watch for "Maximum update depth exceeded" errors and the DevTools Profiler showing the same component rendering repeatedly.
- Keep `eslint-plugin-react-hooks` on. It flags missing dependencies; when its suggestion creates a loop, that signals an unstable dependency to fix, not a rule to disable.

## Example

```jsx
import { useEffect, useMemo, useState } from "react";

// Broken: new `filters` object every render -> effect -> setState -> render -> ...
function BrokenList({ category }) {
  const [items, setItems] = useState([]);
  const filters = { category, limit: 20 };
  useEffect(() => {
    fetch(`/api/items?${new URLSearchParams(filters)}`).then((r) => r.json()).then(setItems);
  }, [filters]); // filters is always "new"
  return <p>{items.length}</p>;
}

// Fixed
function ItemList({ category }) {
  const [items, setItems] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ category, limit: "20" }); // created inside
    fetch(`/api/items?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
    return () => controller.abort();
  }, [category]); // primitive dependency

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000); // updater: no `tick` dep
    return () => clearInterval(id);
  }, []);

  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]); // derived, no effect

  return <p>{items.length} items, total {total}, {tick}s</p>;
}
```

## Common mistakes

- Silencing the exhaustive-deps lint rule instead of stabilizing dependencies.
- Wrapping everything in `useCallback`/`useMemo` without understanding which dependency is unstable.
- Copying props into state with an effect, creating extra renders and loops.
- Assuming `[]` is always safe; it can create stale closures if the effect uses changing values.

## Follow-up questions

- **Why does `[{}]` cause a loop but `[1]` doesn't?** Dependencies are compared with `Object.is`; a new object literal is never equal to the previous one.
- **Is setting state in an effect always bad?** No, e.g. setting fetched data is fine. It is a problem when the update changes the effect's own dependencies unconditionally.
- **What does React Compiler change?** It stabilizes many objects and functions automatically, reducing accidental loops from unstable deps.

## Quick recap

- Loop = effect updates what triggers it.
- Correct deps, updater functions, primitive deps.
- Create objects/functions inside the effect or memoize them.
- Derive values during render instead of syncing with effects.
