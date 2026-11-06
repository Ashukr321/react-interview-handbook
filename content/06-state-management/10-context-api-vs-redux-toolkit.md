---
title: "Context API vs Redux Toolkit"
tags: ["context", "redux-toolkit", "comparison"]
difficulty: "medium"
---

## Short answer

Context is a **transport mechanism**: it passes a value down the tree without prop drilling, and every consumer re-renders when that value changes. Redux Toolkit is a **state management library**: a central store with predictable updates through actions, selector-based subscriptions so components re-render only when their slice changes, middleware, DevTools and RTK Query. Use Context for low-frequency, app-wide values (theme, locale, auth user); use RTK for large, frequently-updated, shared client state.

## Explanation

Context is like a building's PA system: anyone listening hears every announcement, even ones not meant for them. Redux is like a mailroom: each person subscribes to their own mailbox and only gets notified when their mail changes.

### Comparison

| Aspect | Context API | Redux Toolkit |
|---|---|---|
| What it is | Dependency injection built into React | External store + library |
| Where state lives | `useState`/`useReducer` in a provider component | A single store outside React |
| Re-render granularity | All consumers of a provider re-render on value change | Only components whose selected value changed |
| Selectors | None built in (React 19 still has no context selectors) | `useSelector`, memoized `createSelector` |
| Async / side effects | Your own `useEffect` code | Thunks, listener middleware, RTK Query |
| DevTools | React DevTools only | Redux DevTools: action log, diff, time travel |
| Server data caching | None | RTK Query |
| Setup cost | Very low, no dependency | Store, slices, Provider (small with RTK) |
| Bundle size | 0 KB | Roughly 12-15 KB min+gzip for RTK + react-redux |
| Best for | Theme, locale, auth, feature flags, compound components | Carts, editors, dashboards, complex workflows |

### When Context is enough

- Value changes rarely.
- Few consumers, or all consumers need the whole value anyway.
- You want to avoid a dependency in a small app or a reusable library.

### When to pick Redux Toolkit

- Many components read different parts of a large, frequently-changing state.
- Complex update logic you want in pure, testable reducers.
- You need middleware, action logging, undo, or a time-travel debugger.
- You also want a server cache (RTK Query) in the same tool.

They are not mutually exclusive: `react-redux` itself uses Context to pass the store, and many apps use RTK for domain state plus small Contexts for theme and auth.

## Example

```jsx
// Context: fine for theme
import { createContext, useContext, useState, useMemo } from "react";

const ThemeContext = createContext("light");

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext value={value}>{children}</ThemeContext>; // React 19 shorthand
}
export const useTheme = () => useContext(ThemeContext);
```

```jsx
// Redux Toolkit: each component subscribes to just what it needs
import { useSelector } from "react-redux";

function CartBadge() {
  const count = useSelector((s) => s.cart.items.length); // re-renders only when count changes
  return <span>{count}</span>;
}
```

## Common mistakes

- Saying "Context replaces Redux". It replaces prop drilling, not state management features.
- Putting a large, fast-changing object in one Context and then wondering why everything re-renders.
- Creating the provider `value` inline without `useMemo`, so consumers re-render whenever the provider's parent renders.
- Adding Redux to a small app that only shares a theme and a user.

## Follow-up questions

- **Can useReducer + Context replace Redux?** For moderate apps, yes, but you lose selector-level subscriptions, middleware and DevTools, and re-render control gets harder as it grows.
- **How do you reduce Context re-renders?** Split providers by concern, memoize the value, separate state and dispatch contexts, or switch to a selector-based store.
- **What about Zustand or Jotai?** They offer selector-based subscriptions with less ceremony than Redux; good middle ground.

## Quick recap

- Context passes values; Redux manages state.
- Context re-renders all consumers; Redux re-renders only matching selectors.
- Context for rare, global values; RTK for big, busy, shared state.
- They work well together.
