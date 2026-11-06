---
title: "When would removing useMemo actually improve performance?"
tags: ["usememo", "memoization", "performance", "react-compiler"]
difficulty: "medium"
---

## Short answer

Removing `useMemo` helps when the cached work is cheaper than the memoization bookkeeping, when the dependencies change on every render (so it never hits the cache), when nobody depends on the value's identity, or when it holds large values in memory for no benefit. Deleting it also removes stale-dependency bugs and makes the code easier to optimize properly, or easier for the React Compiler to optimize.

## Why it happens

Every `useMemo` call does this on *every* render:

```text
allocate deps array → read previous deps → Object.is each dep
   ├─ all equal → return cached value (retain old value in memory)
   └─ any changed → run fn, store new value + deps
```

If the function itself is trivial, the hit path costs about as much as the computation. If the deps always change, you pay for the miss path *plus* the computation.

### Situations where removal is a win

| Situation | Why `useMemo` hurts |
| --- | --- |
| Trivial work (`a * 2`, string concat, `.length`) | Overhead ≥ computation |
| Deps are inline objects/arrays/functions | Cache never hits |
| Value isn't passed to `memo` children or effect deps | Identity stability is unused |
| Component re-renders rarely | Little to save, permanent cost in memory and complexity |
| Large cached datasets per row/item | Memory pressure, more GC |
| Codebase uses the React Compiler | Compiler memoizes more precisely; manual hooks are redundant |

## How to fix it

1. Find the `useMemo` calls on hot paths (components rendered many times, like list rows).
2. Measure the wrapped function with `console.time`. Well under 1 ms is a candidate for removal.
3. Check whether the result is used by a `memo` child, an effect dependency, or another hook's deps. If not, identity doesn't matter.
4. Remove it, or fix the root cause (unstable deps, state placed too high).

```jsx
// Rendered 1,000 times in a list: memo overhead per row adds up
function Row({ user }) {
  // ❌ cheap work, and `user` is a new object from the API on every poll anyway
  // const label = useMemo(() => `${user.first} ${user.last}`, [user]);

  // ✅ just compute it
  const label = `${user.first} ${user.last}`;
  return <li>{label}</li>;
}
```

> **⚠️ Gotcha:** Don't remove `useMemo` where the value feeds a `useEffect` dependency. A new identity every render would re-run the effect, possibly in a loop of fetches or subscriptions.

> **💡 Interview tip:** With the **React Compiler**, the team's guidance is to keep existing manual memoization (removing it can change compiled output) but not to add new `useMemo` by default. Let the compiler handle it and use manual hooks as escape hatches.

## How to verify

- Profile the same interaction in a production build before and after removal; compare commit times and the scripting time in Chrome Performance.
- Check effect behavior hasn't changed (no new effect runs in logs).

## Follow-up questions

- **Is `useMemo` ever needed for correctness?** It shouldn't be. React may discard the cache, so code must work without it.
- **Does removing it from a parent affect a `memo` child?** Yes. The child will now get a new reference and re-render, so check that first.
- **How else can you get stable identity cheaply?** Hoist constants outside the component, or pass primitives.

## Quick recap

- `useMemo` costs work on every render, hit or miss.
- Remove it for trivial work, ever-changing deps, or unused identity.
- Keep it for expensive work and identity-sensitive consumers.
- The React Compiler makes most manual memoization unnecessary.
