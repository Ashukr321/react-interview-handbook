---
title: "You change one item in a large list, but the whole list appears to re-render. How would you investigate?"
tags: ["lists", "debugging", "profiler", "keys", "react-memo"]
difficulty: "medium"
---

## Short answer

First find out whether it's re-*rendering* (React work) or re-*mounting / repainting* (DOM work), because they have different causes. Then, using the Profiler's "Why did this render?", check the usual suspects: rows aren't memoized, every row gets a new prop each render (inline callback, cloned objects), the update replaces every item's reference, or the keys are unstable so React remounts the rows.

## Why it happens

| Symptom | Likely root cause |
| --- | --- |
| All rows *render*, DOM barely changes | Rows not memoized, or props unstable |
| All rows render, `memo` present | Inline `onClick`, `style={{}}`, or a context every row reads |
| All rows lose focus or input state, DOM nodes recreated | Keys are `Math.random()`, `index` after sorting, or change each fetch |
| Every item has a new reference | Update does `data.map(i => ({ ...i }))` or re-fetches and replaces everything |
| The list's parent remounts | Component defined *inside* another component, or the parent's key changes |

## How to fix it

### Step-by-step investigation

1. **Profiler**: record one item change. If 1,000 rows are coloured, open one and read "Why did this render?" ("Props changed: onSelect", "Context changed", "Parent rendered").
2. **Check mounts versus updates**: add a temporary mount log.
3. **Elements panel**: if every `<li>` flashes or is replaced, it's a remount (key problem), not just a render.
4. **Inspect the update code**: does it preserve references for unchanged items?

```jsx
import { memo, useCallback, useEffect, useState } from "react";

const Row = memo(function Row({ item, onSelect }) {
  useEffect(() => {
    console.log("mounted", item.id); // fires again → remount → key problem
  }, []);
  return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
});

export default function List({ initial }) {
  const [items, setItems] = useState(initial);

  // ✅ stable callback
  const handleSelect = useCallback((id) => {
    // ✅ only the changed item gets a new reference
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  }, []);

  return (
    <ul>
      {items.map((item) => (
        // ✅ stable key from data, not index or random
        <Row key={item.id} item={item} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

### Other fixes

- If data is re-fetched, use a cache that preserves structural sharing (TanStack Query does this by default) so unchanged items keep their references.
- Don't define `Row` inside `List`'s body, or it's a new component type on every render and React remounts every row.
- Split row-level context, or pass the needed value as a prop.
- Virtualize very long lists.

> **💡 Interview tip:** With the **React Compiler**, row callbacks and JSX are memoized automatically, but it can't fix unstable keys or update code that clones every item.

## How to verify

- The Profiler shows exactly one row rendered for one change.
- No repeated "mounted" logs.
- The Elements panel flashes only the changed `<li>`.

## Follow-up questions

- **How do you tell a re-render from a remount?** Remounts reset state and re-run mount effects; the DOM node identity changes, which you can check by storing a ref and comparing.
- **Does `memo` help if the row reads a context that changes?** No. Context changes bypass `memo`.
- **What about index keys in a static, never-reordered list?** They're acceptable there.

## Quick recap

- Distinguish render, remount and repaint before fixing.
- Use "Why did this render?" in the Profiler.
- Stable keys, stable callbacks, structural sharing, `memo` rows.
- Never define components inside components.
