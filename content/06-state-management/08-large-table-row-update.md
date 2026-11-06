---
title: "You have a table displaying 10,000 users. Updating one row re-renders the entire table. How will you solve?"
tags: ["performance", "tables", "virtualization", "normalization", "scenario"]
difficulty: "hard"
---

## Short answer

Two fixes together. First, make a row update touch only that row: store users **normalized** (`{ ids, entities }`), render rows as `React.memo` components that receive an **id**, and have each row select its own user from the store. Second, **virtualize** the table with TanStack Virtual or react-window so only the ~30 visible rows are mounted. With both, editing one user re-renders one row component.

## Why it happens

```text
const [users, setUsers] = useState([...10000 users])
updateUser -> setUsers(users.map(...))   // new array reference
      |
      v
<Table users={users}>  re-renders
      |
      v
10,000 <Row user={u} onEdit={() => ...}>  all re-render
```

- The whole array lives in the table's state, so any change re-renders the table.
- Rows are not memoized, or they are memoized but get a new inline `onEdit` function each time.
- All 10,000 rows are in the DOM, so even a cheap re-render of each is expensive, and initial mount is slow.

## How to fix it

1. **Normalize the data** so updating one user creates one new entity object and leaves the other 9,999 references unchanged.
2. **Pass ids, not objects**, and let each row subscribe to its own entity (Redux `useSelector`, Zustand selector, or a per-row store).
3. **Memoize rows** with `React.memo` and stable callbacks (`useCallback`, or dispatch actions directly from the row).
4. **Virtualize**: render only visible rows with `@tanstack/react-virtual` or `react-window`.
5. **Stable keys**: use `user.id`, never the array index.
6. For sorting/filtering, compute the visible `ids` with a memoized selector so the id list only changes when the order does.

```jsx
// usersSlice.js
import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";

const usersAdapter = createEntityAdapter();
const usersSlice = createSlice({
  name: "users",
  initialState: usersAdapter.getInitialState(),
  reducers: {
    usersLoaded: usersAdapter.setAll,
    userUpdated: usersAdapter.updateOne, // { id, changes }
  },
});
export const { usersLoaded, userUpdated } = usersSlice.actions;
export const usersSelectors = usersAdapter.getSelectors((s) => s.users);
export default usersSlice.reducer;
```

```jsx
// UsersTable.jsx
import { memo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usersSelectors, userUpdated } from "./usersSlice";

const Row = memo(function Row({ id, style }) {
  const user = useSelector((s) => usersSelectors.selectById(s, id));
  const dispatch = useDispatch();
  return (
    <div style={style} className="row">
      <span>{user.name}</span>
      <button onClick={() => dispatch(userUpdated({ id, changes: { active: !user.active } }))}>
        {user.active ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
});

export function UsersTable() {
  const ids = useSelector(usersSelectors.selectIds);
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((v) => (
          <Row
            key={ids[v.index]}
            id={ids[v.index]}
            style={{ position: "absolute", top: 0, height: v.size, width: "100%", transform: `translateY(${v.start}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
```

`updateOne` changes only `entities[id]`; `ids` keeps its reference, so `UsersTable` does not re-render and only the matching `Row`'s selector returns a new value.

> **⚠️ Gotcha:** The `style` object above is new on every parent render, which would break `memo`. Here it is fine because the parent only re-renders on scroll, when positions really change. Without virtualization, do not pass inline objects to memoized rows.

## How to verify

- React Profiler: after toggling one user, the commit shows a single `Row` render.
- DOM inspector: only around 30 to 50 row elements exist while scrolling.
- Performance panel: scrolling stays near 60 fps with no long tasks.

## Follow-up questions

- **What if you cannot use Redux?** Same idea with Zustand selectors, or `useSyncExternalStore` over a small store; with plain state, keep a `Map` and memoized rows with stable callbacks.
- **What about server-side data?** Paginate or use infinite queries so the client never holds all 10,000 rows if it does not need to.
- **How do virtualized tables handle accessibility?** Set `aria-rowcount` and `aria-rowindex` so screen readers know the full size.

## Quick recap

- Normalize so one update changes one reference.
- Rows receive ids and select their own data.
- `React.memo` plus stable props keeps other rows idle.
- Virtualize so only visible rows exist in the DOM.
