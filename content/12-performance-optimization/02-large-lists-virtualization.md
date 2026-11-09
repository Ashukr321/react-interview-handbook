---
title: "Optimizing large lists: windowing with react-window / react-virtualized"
asked_as: ["How would you optimize a React application rendering 100k+ items in a list?"]
tags: ["virtualization", "windowing", "lists", "performance"]
difficulty: "medium"
---

## Short answer

Use **windowing (virtualization)**: render only the rows visible in the viewport plus a small overscan, and fake the full scroll height with one tall container. With 100k items the DOM holds about 20 to 50 rows instead of 100k, so mount time, memory and scroll cost stay flat. `react-window` (small, simple) or `@tanstack/react-virtual` (headless, flexible) are the modern choices; `react-virtualized` is the older, heavier predecessor. For 100k+ items I combine it with server pagination or infinite loading, memoized rows, stable keys and moving heavy filtering off the main thread.

## Explanation

A virtualized list is like a train window. The landscape is hundreds of kilometers long, but you only ever see what fits in the window; the scenery outside the frame does not need to exist for you.

### Why rendering 100k rows is slow

- 100k components to run, 100k+ DOM nodes to create, style and lay out.
- Memory grows with each node and its event listeners.
- Any parent re-render touches every row.
- The browser's layout and paint per scroll frame increase.

### How windowing works

```text
+------------------------------+  scroll container (height: 600px, overflow: auto)
|  spacer height = 100000 * 40 |  <- makes the scrollbar realistic
|                              |
|   [row 2500]  top = 100000px |  <- only visible rows are mounted,
|   [row 2501]                 |     absolutely positioned
|   ...                        |
|   [row 2515]                 |
+------------------------------+
on scroll: compute startIndex = floor(scrollTop / rowHeight), render start..end
```

### Library comparison

| Library | Notes |
|---|---|
| `react-window` | Tiny, by the react-virtualized author; fixed and variable size lists and grids |
| `@tanstack/react-virtual` | Headless hook, dynamic measurement, works with any markup, tables, horizontal |
| `react-virtualized` | Older, larger API (AutoSizer, CellMeasurer, InfiniteLoader); mostly legacy now |
| `react-virtuoso` | Handles dynamic heights, grouped lists and chat-style reverse scroll out of the box |

### Full checklist for 100k+ items

1. **Do you need all items on the client?** Prefer server-side pagination, filtering and search; fetch pages with infinite queries.
2. **Virtualize** the visible window.
3. **Memoize rows** (`React.memo`) and pass stable props; keys from item ids.
4. **Keep row components cheap**: no per-row effects or heavy computations.
5. **Filter/sort heavy data** in a memoized selector, `useDeferredValue`, or a Web Worker.
6. **Use CSS `content-visibility: auto`** for long, non-interactive content where a library is overkill.

## Example

```jsx
import { memo } from "react";
import { FixedSizeList as List } from "react-window";

const items = Array.from({ length: 100_000 }, (_, i) => ({ id: i, name: `User ${i}` }));

// react-window passes index, style and itemData; style positions the row
const Row = memo(function Row({ index, style, data }) {
  const item = data[index];
  return (
    <div style={style} className={index % 2 ? "odd" : "even"}>
      {item.name}
    </div>
  );
});

export function UserList() {
  return (
    <List
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={40}
      itemData={items}
      itemKey={(index, data) => data[index].id}
      overscanCount={5}
    >
      {Row}
    </List>
  );
}
```

The example uses the long-standing react-window 1.x API. react-window 2.x renames it to `<List rowComponent={Row} rowCount={n} rowHeight={40} rowProps={...} />`, but the idea is identical.

> **⚠️ Gotcha:** Always apply the `style` prop the library gives each row. Dropping it stacks all rows at the top and breaks scrolling.

## Common mistakes

- Variable-height rows with a fixed `itemSize`, causing overlap; use variable-size lists or dynamic measurement.
- Defining the row component inside the parent, so it is a new component type every render and remounts.
- Forgetting accessibility: `Ctrl+F` cannot find unrendered rows, so provide search, and set `aria-rowcount`/`aria-setsize`.
- Loading 100k items from the API when the user only views the first few pages.

## Follow-up questions

- **How do you combine virtualization with infinite scroll?** Use `react-window-infinite-loader` or TanStack Virtual with `useInfiniteQuery`, fetching the next page when the last virtual item nears the end.
- **What is overscan?** Extra rows rendered just outside the viewport so fast scrolling does not show blank gaps.
- **When not to virtualize?** For a few hundred simple rows, plain rendering or pagination is simpler and SEO/Ctrl+F friendly.

## Quick recap

- Render only visible rows; fake the total height.
- react-window or TanStack Virtual for modern apps.
- Pair with server pagination, memoized rows and stable keys.
- Watch out for dynamic heights and accessibility.
