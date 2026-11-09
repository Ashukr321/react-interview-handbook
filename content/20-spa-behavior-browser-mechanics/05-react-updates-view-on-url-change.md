---
title: "How does React update the view when the URL changes without reloading the document?"
tags: ["react-router", "reconciliation", "virtual-dom", "spa"]
difficulty: "medium"
---

## Short answer

The router keeps the current location in React state and shares it through context. When the URL changes (via `pushState` or `popstate`), the router updates that state, which triggers a re-render. `<Routes>` matches the new path to a different element tree, and React's reconciliation compares it with the previous tree, so only the parts that differ are unmounted, mounted or updated in the DOM. Shared layouts stay mounted and keep their state.

## Explanation

Picture a picture frame on a wall (the layout) with a slot for a photo (the outlet). Changing the URL swaps the photo; the frame and the wall stay put.

```text
 URL change (Link click / back button)
        |
        v
 Router: setLocation(newLocation)        <- React state update
        |
        v
 Re-render: <Routes> matches "/users/7" -> [RootLayout, UsersLayout, UserDetail]
        |
        v
 Reconciliation (diff old vs new element tree)
   RootLayout   same type  -> keep, update props
   UsersLayout  same type  -> keep (state preserved)
   UserList -> UserDetail  different type -> unmount old, mount new
        |
        v
 Commit: minimal DOM changes, browser paints
```

### Details worth mentioning

- **Matching**: React Router ranks routes by specificity, so `/users/new` beats `/users/:id`.
- **Nested routes and `<Outlet>`**: parent layouts render once and their outlet swaps children.
- **Same component, different params**: moving from `/users/7` to `/users/8` keeps `UserDetail` mounted; only `useParams()` changes. Effects depending on `id` re-run. Add `key={id}` if you want a full reset.
- **Transitions**: data routers wrap navigations in `startTransition`, so the old screen stays visible until the new one is ready instead of flashing a fallback.
- **Hooks**: `useLocation`, `useParams`, `useSearchParams` subscribe components to parts of the URL.

## Example

```jsx
import { BrowserRouter, Routes, Route, Outlet, Link, useParams } from "react-router";
import { useEffect, useState } from "react";

function UsersLayout() {
  const [filter, setFilter] = useState(""); // survives navigation between users
  return (
    <div className="users">
      <input value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter" />
      <nav>
        <Link to="/users/7">User 7</Link> <Link to="/users/8">User 8</Link>
      </nav>
      <Outlet /> {/* only this part changes */}
    </div>
  );
}

function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/users/${id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setUser)
      .catch(() => {});
    return () => controller.abort(); // cancel when id changes
  }, [id]);
  return <h2>{user ? user.name : "Loading..."}</h2>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/users" element={<UsersLayout />}>
          <Route path=":id" element={<UserDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

## Common mistakes

- Expecting a component to remount when only its route params change; it re-renders instead, so stale local state can linger.
- Reading `window.location` directly in render; it is not reactive, use `useLocation`.
- Putting layouts inside each page instead of nested routes, causing them to remount on every navigation.
- Not cancelling requests when params change, causing race conditions.

## Follow-up questions

- **Is the whole app re-rendered on navigation?** The router context changes, so subscribed components re-render, but React only commits DOM differences, and memoized subtrees can skip work.
- **How do you reset state on param change?** Give the route element a `key` based on the param, or derive state from the param.
- **How does Next.js do this?** Its client router fetches the RSC payload for the new segment and React reconciles it, keeping shared layouts mounted.

## Quick recap

- Location lives in router state; URL change = state update.
- `<Routes>` matches a new element tree.
- Reconciliation updates only what changed; layouts keep their state.
- Param changes re-render, not remount, unless you add a `key`.
