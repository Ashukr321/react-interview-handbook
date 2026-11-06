---
title: "How would you optimize rendering for a list containing 100,000 items?"
tags: ["virtualization", "lists", "performance", "windowing"]
difficulty: "medium"
---

## Short answer

Never render 100,000 DOM nodes. I use virtualization (windowing) so only the 20-50 rows visible in the viewport, plus a small overscan, are rendered, and rows are recycled as the user scrolls. I combine it with stable `key`s, memoized row components, and loading data in pages from the server, so neither the DOM nor memory holds everything at once.

## Why it happens

Rendering 100,000 rows means 100,000+ components and several hundred thousand DOM nodes. Initial render takes seconds, memory grows by hundreds of MB, every update diffs a giant tree, and scrolling forces layout over a huge document.

```text
Without virtualization            With virtualization
+------------------+              +------------------+
| row 1            |              | spacer (top)     |  <- height only
| row 2            |              | row 4,210        |
| ...              |              | ...  ~30 rows    |  <- real DOM
| row 100,000      |              | row 4,240        |
+------------------+              | spacer (bottom)  |
100k DOM rows                     +------------------+
```

## How to fix it

### 1. Virtualize

```jsx
import { useRef, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const Row = memo(function Row({ item }) {
  return <div className="row">{item.name} - {item.email}</div>;
});

export function UserList({ users }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  return (
    <div ref={parentRef} style={{ height: "80vh", overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((v) => (
          <div
            key={users[v.index].id}
            ref={virtualizer.measureElement}
            data-index={v.index}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${v.start}px)` }}
          >
            <Row item={users[v.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

`measureElement` handles dynamic row heights. Alternatives: `react-window`, `react-virtuoso` (great for chat and variable heights), AG Grid for tables.

### 2. Load data incrementally

- Server-side pagination or cursor-based infinite scroll (`useInfiniteQuery`).
- Filter and sort on the server so the client never needs all 100k items.

### 3. Keep rows cheap

- Stable `key` from the item ID, never the index when items can reorder.
- Memoized row components with primitive or stable props.
- Avoid heavy per-row work (formatters, images without fixed size).

### 4. Consider CSS-only help for moderate lists

`content-visibility: auto` with `contain-intrinsic-size` lets the browser skip rendering off-screen content. It helps a few thousand items, but React still creates every component, so it is not enough for 100k.

> **⚠️ Gotcha:** Virtualized lists break browser Ctrl+F and can confuse screen readers. Provide in-app search, and keep `role="list"` / `aria-rowcount` / `aria-rowindex` for accessibility.

## How to verify

- DOM node count stays in the hundreds while scrolling.
- Initial render in milliseconds instead of seconds; smooth 60 fps scroll in the Performance panel.
- Memory stays flat when scrolling through the whole list.

## Follow-up questions

- **What is overscan?** Extra rows rendered just outside the viewport so fast scrolling does not show blank gaps.
- **Virtualization vs pagination?** Virtualization keeps a continuous scroll; pagination limits data per page and suits search-heavy UIs.
- **Why are index keys risky here?** When items are inserted or sorted, React reuses the wrong row state.

## Quick recap

- Render only what is visible: virtualize.
- Fetch and filter on the server in pages.
- Stable keys and memoized, cheap rows.
- Mind accessibility and in-app search.
