---
title: "Your API is called infinitely. What could be wrong?"
tags: ["scenario", "useEffect", "dependencies", "infinite-loop"]
difficulty: "easy"
---

## Short answer

An effect that fetches data and sets state is re-running after every render. The usual causes: the effect has no dependency array, its dependencies include the state it sets, or a dependency is an object, array or function recreated on every render. The fix is to give the effect a correct dependency array made of stable or primitive values, or move fetching into a data library that handles it.

## Why it happens

An effect runs after render. Setting state causes another render. If the effect runs again after that render, you get a loop:

```text
 render -> effect: fetch -> setData -> render -> effect: fetch -> setData -> ...
```

| Cause | Why it re-runs |
|---|---|
| `useEffect(fn)` with no array | Runs after every render |
| `[data]` while the effect calls `setData` | New data (new object) changes the dependency every time |
| `[filters]` where `filters = { page }` is created in render | New object identity every render |
| `[fetchUsers]` where the function is defined in the component | New function every render |
| Parent passes `options={{ sort: "asc" }}` | New prop object every parent render |

> **⚠️ Gotcha:** In development, Strict Mode runs effects twice on mount (mount, cleanup, mount). Two requests is expected; endless requests is a bug.

## How to fix it

1. Add a dependency array listing only what the fetch actually uses.
2. Never depend on the state the effect sets.
3. Depend on primitives (`page`, `userId`) instead of objects.
4. Define helper functions inside the effect, or memoize them.
5. Add cleanup to cancel in-flight requests.

```jsx
import { useEffect, useState } from "react";

// Buggy
function UsersBuggy({ page }) {
  const [users, setUsers] = useState([]);
  const params = { page, limit: 20 }; // new object each render
  useEffect(() => {
    fetch(`/api/users?page=${params.page}&limit=${params.limit}`)
      .then((r) => r.json())
      .then(setUsers);
  }, [params, users]); // both change every time -> infinite loop
  return <List items={users} />;
}

// Fixed
function Users({ page }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/users?page=${page}&limit=20`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setUsers)
      .catch((e) => { if (e.name !== "AbortError") console.error(e); });
    return () => controller.abort();
  }, [page]); // primitive, changes only when the page changes
  return <List items={users} />;
}

function List({ items }) {
  return <ul>{items.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

Better still, let TanStack Query manage it: `useQuery({ queryKey: ["users", page], queryFn })` dedupes, caches and never loops.

## How to verify

- Network tab: one request per real change of `page` (two on mount in Strict Mode dev).
- Keep the `react-hooks/exhaustive-deps` ESLint rule on; it flags missing and unstable dependencies.
- Add a temporary `console.count("fetch")` inside the effect.

## Follow-up questions

- **Why not just pass `[]` to stop the loop?** It hides the bug: the data will not refetch when `page` changes, and the linter will warn.
- **Can `useMemo` fix an object dependency?** Yes, `useMemo(() => ({ page }), [page])` keeps identity stable, but depending on `page` directly is simpler.
- **Does React Compiler fix this?** It memoizes values created during render, which removes many identity-based loops, but a missing or self-referencing dependency is still a bug.

## Quick recap

- Effect sets state, state triggers render, effect runs again.
- Causes: no array, depending on set state, unstable objects/functions.
- Use primitive dependencies and define helpers inside the effect.
- Strict Mode double call in dev is not an infinite loop.
