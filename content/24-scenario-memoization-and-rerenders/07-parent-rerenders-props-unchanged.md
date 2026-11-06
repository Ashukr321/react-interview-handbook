---
title: "A parent component re-renders, but none of its props changed. Will the child re-render?"
tags: ["re-renders", "react-memo", "composition", "rendering"]
difficulty: "easy"
---

## Short answer

Yes, by default. When a component renders, React renders **all of its children** recursively, whether or not their props changed. Children are skipped only if they're wrapped in `memo` with equal props, if the same element object was passed in from above (for example via `children`), or if the React Compiler memoized the JSX.

## Why it happens

React doesn't track which props a child "uses". Rendering a parent means calling it, which produces new JSX for its children, and React then calls those child components to see what *they* return. "Props changed" isn't the trigger; "parent rendered" is.

```text
setState in Parent
   └─ Parent renders
        ├─ Child renders          (no memo → always)
        │    └─ GrandChild renders
        └─ MemoChild              (memo + equal props → skipped)
```

Rendering isn't the same as updating the DOM. If the output is identical, the commit phase makes no DOM changes. Re-renders cost CPU, not necessarily paint.

### The element-identity bail-out

If a parent receives a JSX element from *its* parent (as `children` or another prop), that element is the same object on every render of the parent. React sees the identical element and skips it.

## How to fix it

Only fix it if the Profiler shows it's slow. Options, from cheapest to most involved:

1. **Move state down** into the component that actually needs it.
2. **Lift content up** and pass the expensive subtree as `children`.
3. **Wrap the child in `memo`** and keep its props stable.
4. **Enable the React Compiler**, which memoizes JSX automatically.

```jsx
import { useState } from "react";

function ScrollTracker({ children }) {
  const [y, setY] = useState(0);
  return (
    <div onScroll={(e) => setY(e.currentTarget.scrollTop)} style={{ height: 300, overflow: "auto" }}>
      <p>Scrolled: {y}px</p>
      {children /* same element object: not re-rendered on scroll */}
    </div>
  );
}

export default function Page() {
  return (
    <ScrollTracker>
      <ExpensiveArticle />
    </ScrollTracker>
  );
}
```

Scrolling re-renders `ScrollTracker`, but `<ExpensiveArticle />` was created by `Page`, which didn't re-render, so React skips it.

## How to verify

- Turn on "Highlight updates when components render" in React DevTools.
- In the Profiler, skipped components appear grey with "Did not render".
- Add `console.log("render")` to the child temporarily (expect double logs in Strict Mode during development).

## Follow-up questions

- **Does a context change re-render children that don't consume it?** No. Only consumers re-render, unless their ancestors re-render for other reasons.
- **Is re-rendering a bug?** Usually not. It's React's normal model, and it only matters when it's measurably slow.
- **Will the child's state reset?** No. Re-rendering preserves state; only unmounting (or changing the key or type) resets it.

## Quick recap

- Parent renders → children render, regardless of props.
- `memo`, element identity (`children`), or the React Compiler can skip them.
- Re-render ≠ DOM update.
- Prefer moving state down and composing with `children` before reaching for `memo`.
