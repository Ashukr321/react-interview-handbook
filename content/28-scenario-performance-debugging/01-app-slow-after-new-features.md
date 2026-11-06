---
title: "Your React application suddenly becomes slow after adding new features. How would you identify and fix the issue?"
asked_as: ["Your React app suddenly becomes slow after adding new features. How do you find and fix the issue? (Debugging Performance)"]
tags: ["performance", "debugging", "profiler", "regression"]
difficulty: "medium"
---

## Short answer

Because it got slow "after new features", I treat it as a regression: find which change caused it (compare releases, `git bisect`, bundle diff), then measure with the React Profiler and Chrome Performance panel to see whether the cost is extra re-renders, an expensive computation, a bigger bundle or more network requests. I fix that specific cause and add a performance budget so it cannot creep back unnoticed.

## Why it happens

New features commonly bring:

- **State lifted too high** or a new value in a widely used Context, so far more components re-render.
- **Unstable props**: inline objects/functions that defeat `memo`.
- **Heavy dependencies** (charting, date, editor libraries) added to the main bundle.
- **Expensive work in render**: filtering/sorting large arrays on every keystroke.
- **Request waterfalls**: new components fetching in sequence inside `useEffect`.
- **Effects that loop**: `setState` in an effect with a dependency that changes every render.

## How to fix it

### 1. Find the culprit change

```bash
git bisect start
git bisect bad HEAD
git bisect good v2.3.0        # last fast release
# test each step, mark good/bad until the commit is found
```

Also compare bundle reports (`rollup-plugin-visualizer`, `@next/bundle-analyzer`) and Lighthouse scores between the two versions.

### 2. Measure where time goes

```text
React Profiler  -> which components render, why, how long
Performance tab -> long tasks, scripting vs layout vs paint
Network tab     -> new requests, sizes, waterfalls
```

### 3. Fix by cause

```jsx
// Before: new "theme" state in a top-level context re-renders the whole app
<AppContext.Provider value={{ user, theme, setTheme }}>

// After: split contexts and memoize the value
const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);
<UserContext.Provider value={user}>
  <ThemeContext.Provider value={themeValue}>
    {children}
  </ThemeContext.Provider>
</UserContext.Provider>
```

| Cause | Fix |
| --- | --- |
| Too many re-renders | Move state down, split context, `memo` + stable props |
| Expensive render | `useMemo`, Web Worker, `useDeferredValue` |
| Big bundle | `React.lazy` / dynamic `import()`, lighter library |
| Waterfalls | Parallel fetch, route loaders, React Query prefetch |
| Long lists | Virtualization |

> **💡 Interview tip:** Say "measure first". Wrapping everything in `memo` without data is a red flag to interviewers.

### 4. Guard against regressions

Add bundle-size budgets (`size-limit`) and Lighthouse CI to pull requests, and track Web Vitals per release.

## How to verify

- Profiler recording of the same interaction shows fewer/shorter renders.
- Lighthouse and bundle size are back to the old baseline.
- Field INP/LCP per release returns to normal.

## Follow-up questions

- **What is `git bisect`?** A binary search over commits to find the first bad one.
- **Will the React Compiler fix this?** It removes most manual memoization needs, but not big bundles, waterfalls or heavy algorithms.
- **How do you profile production?** Use a profiling build or the `<Profiler>` API and RUM data.

## Quick recap

- Treat it as a regression: find the change.
- Measure renders, long tasks, bundle and network.
- Fix the actual cause with the matching technique.
- Add budgets and CI checks to stop it recurring.
