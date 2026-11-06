---
title: "How would you identify unnecessary re-renders?"
tags: ["re-renders", "devtools", "why-did-you-render", "profiler"]
difficulty: "medium"
---

## Short answer

A re-render is unnecessary when a component renders but produces the same output because its inputs did not meaningfully change. I spot them with React DevTools "Highlight updates when components render", then confirm with the Profiler's "Why did this render?" which tells me if props, state, hooks, context or the parent caused it. Tools like `why-did-you-render` or React Scan flag renders where props were equal by value but not by reference.

## Why it happens

- **Parent re-rendered**: children re-render by default.
- **New references**: inline objects, arrays and functions (`style={{}}`, `onClick={() => ...}`) are new each render.
- **Context changes**: a provider value object recreated every render, or a big context where consumers use one field.
- **Selectors returning new objects**: `useSelector((s) => ({ a: s.a, b: s.b }))`.
- **State set to an equal-but-new value**: `setFilters({ ...filters })` with no real change.
- **Derived state in effects**: `useEffect(() => setX(f(y)), [y])` causes an extra render.

## How to fix it

### 1. See it

```text
React DevTools -> Components -> Settings (gear)
  [x] Highlight updates when components render
Interact with the UI: anything flashing that should not change is a suspect.
```

### 2. Find the reason

```text
Profiler -> Settings -> [x] Record why each component rendered
Record -> interact -> stop -> click component:
  "Why did this render?"
    - Props changed: (onSelect, style)
    - Hook 2 changed
    - The parent component rendered
    - Context changed
```

### 3. Catch reference-only changes automatically

```js
// wdyr.js – import first, development only
import React from "react";
if (process.env.NODE_ENV === "development") {
  const whyDidYouRender = (await import("@welldone-software/why-did-you-render")).default;
  whyDidYouRender(React, { trackAllPureComponents: true });
}
```

React Scan (`npx react-scan@latest localhost:3000`) overlays render counts on a running app without code changes.

### 4. Fix the specific cause

```jsx
// Redux: return primitives or use shallowEqual
const { a, b } = useSelector((s) => ({ a: s.a, b: s.b }), shallowEqual);

// Derived state: compute during render instead of an effect
const fullName = `${first} ${last}`; // no useState + useEffect

// Stable props for memoized children
const style = useMemo(() => ({ color }), [color]);
const onSelect = useCallback((id) => select(id), [select]);
```

> **💡 Interview tip:** Not every unnecessary render is a problem. Fix the ones that are frequent and expensive; cheap leaf renders are fine. With the React Compiler enabled, many reference-related renders disappear automatically.

## How to verify

- Highlight updates no longer flashes unrelated components.
- Profiler commit count and render duration drop for the interaction.
- `why-did-you-render` logs are clean for the fixed components.

## Follow-up questions

- **Does a re-render always update the DOM?** No; React diffs the output and only commits changes.
- **Why does StrictMode render twice?** In development it double-invokes renders to expose impure code; it does not happen in production.
- **How do you count renders quickly?** React Scan, the Profiler, or a temporary `console.count("Row")` in the component body.

## Quick recap

- Highlight updates to spot, Profiler "why" to explain.
- `why-did-you-render` / React Scan catch reference-only changes.
- Common causes: parent renders, new references, broad context, derived state in effects.
- Fix frequent and expensive renders first.
