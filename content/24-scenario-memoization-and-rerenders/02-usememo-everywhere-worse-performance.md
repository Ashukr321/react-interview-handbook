---
title: "You used useMemo everywhere, but performance became worse. Why?"
tags: ["usememo", "memoization", "performance", "anti-patterns"]
difficulty: "medium"
---

## Short answer

`useMemo` isn't free. On every render React still has to allocate the dependency array, compare each dependency, and keep the old value in memory. When the wrapped computation is cheap, or the dependencies change on every render anyway, you pay that overhead and get nothing back. Spread across hundreds of components, it adds up.

## Why it happens

Think of `useMemo` like a coat check. It's worth it for a heavy winter coat. Using it for a pair of gloves means you wait in line longer than it would take to just hold them.

| Cost | When it hurts |
| --- | --- |
| Dependency array allocation + comparison | Every render, even on cache hits |
| Memory for cached values | Large derived arrays kept alive for no reason |
| Cache misses | Deps are new objects/functions each render, so it recomputes anyway |
| Extra closures | One more function created per hook per render |
| Code complexity | Wrong deps lead to stale values and bugs that are hard to trace |

Common patterns that made things worse:

- Memoizing trivial work: `useMemo(() => a + b, [a, b])`, or `useMemo(() => items.length, [items])`.
- Unstable deps: `useMemo(() => format(user), [{ ...user }])` misses the cache on every render.
- Memoizing values that no memoized child or effect ever depends on, so referential stability buys nothing.
- Hiding the real bottleneck (an expensive child tree, or state placed too high) under a pile of memo calls.

## How to fix it

1. **Profile first.** Record a slow interaction in React DevTools Profiler and Chrome Performance.
2. **Delete memoization that isn't earning its keep**: cheap math, string formatting, small arrays.
3. **Keep it where it matters**: genuinely expensive calculations (roughly 1 ms or more, which you can measure with `console.time`), or values passed to `memo` children or used as effect dependencies.
4. **Fix structure instead**: move state down, lift content up as `children`, split large components.

```jsx
// Before: overhead with no benefit
const fullName = useMemo(() => `${first} ${last}`, [first, last]);
const isEmpty = useMemo(() => items.length === 0, [items]);

// After: plain expressions are faster and clearer
const fullName = `${first} ${last}`;
const isEmpty = items.length === 0;

// Keep: expensive + feeds a memoized child
const sorted = useMemo(
  () => [...rows].sort((a, b) => a.price - b.price),
  [rows]
);
```

> **💡 Interview tip:** Mention the **React Compiler**. It inserts fine-grained memoization automatically and only where the compiler can prove it's safe, so in compiled codebases manual `useMemo` is mostly unnecessary.

## How to verify

- Compare Profiler commit durations before and after removing the hooks, using a production build.
- Use `console.time` around the computation; if it's well under 1 ms, memoization is noise.
- Check the Chrome Memory panel if cached values were large.

## Follow-up questions

- **Does `useMemo` guarantee the value is cached?** No. React may discard the cache (for example in development or for offscreen components), so it must only be a performance optimization.
- **Is `useMemo` slower than recomputing?** For trivial expressions, often yes, or at best the same.
- **What should you try before memoizing?** State colocation and component composition.

## Quick recap

- Memoization has CPU and memory costs on every render.
- Cheap work + memo = net loss.
- Unstable deps turn `useMemo` into pure overhead.
- Measure, then memoize only expensive or identity-sensitive values.
