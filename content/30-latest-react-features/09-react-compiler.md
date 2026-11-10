---
title: "What is the React Compiler and does it replace useMemo and useCallback?"
tags: ["react-compiler", "memoization", "performance", "build-tools"]
difficulty: "medium"
asked_as: ["Do we still need useMemo and useCallback?", "How does the React Compiler work?", "What is 'use no memo'?"]
---

## Short answer

The React Compiler (stable **1.0 since October 2025**) is a **build-time plugin** (Babel, with support in Vite, Next.js, Expo and others) that analyzes your components and hooks and **adds memoization automatically**. It skips re-rendering parts of the tree whose inputs didn't change, which is what `React.memo`, `useMemo` and `useCallback` did by hand. In code it compiles, you rarely need those manually anymore. It only works on code that follows the **Rules of React**; code that breaks them is skipped, not "fixed".

## Explanation

Manual memoization is easy to get wrong: a missing dependency gives stale values, and an unstable object prop silently breaks `memo`. The Compiler does this work for you, at a finer grain than people do by hand. It can even memoize individual JSX elements and values after an early return, which hooks can't do.

```text
 Your code  -->  React Compiler (build time)  -->  Same code + cached values
                 checks the Rules of React          re-computed only when inputs change
```

### What it needs from your code

- Components and hooks are **pure** during render: no mutating props, state or outside variables.
- No reading or writing `ref.current` during render.
- Hooks follow the rules (top level, React functions only).

If a component breaks these rules, the Compiler leaves it untouched. The lint rules for these checks are now included in `eslint-plugin-react-hooks`.

### Adoption

| Topic | Answer |
| --- | --- |
| React versions | 19 natively; 17 and 18 with `react-compiler-runtime` |
| Opt out a component | Add the `"use no memo"` directive |
| Opt in gradually | `compilationMode: "annotation"`, then mark files with `"use memo"` |
| Existing `useMemo` / `useCallback` | Safe to keep; the Compiler works with them |

## Example

```jsx
// What you write: no manual memoization
export default function ProductList({ products, filter, onSelect }) {
  const visible = products.filter((p) => p.category === filter);
  const handleClick = (id) => onSelect(id);

  return (
    <ul>
      {visible.map((p) => (
        <ProductRow key={p.id} product={p} onClick={handleClick} />
      ))}
    </ul>
  );
}

// What the Compiler effectively produces (simplified idea):
// - `visible` is recomputed only when `products` or `filter` change
// - `handleClick` keeps the same identity while `onSelect` is the same
// - the <ul> JSX is reused when none of its inputs changed
```

```js
// vite.config.js
import react from "@vitejs/plugin-react";

export default {
  plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } })],
};
```

## Common mistakes

- Thinking the Compiler fixes slow code that breaks the Rules of React. It skips that code; fix the impurity first (the linter shows where).
- Removing every `useMemo` right away. Keep them where a stable value is needed for correctness, such as an effect dependency, until you've checked the compiled behavior.
- Expecting it to fix slow *work*, like a 50ms loop on every keystroke. Memoization avoids repeated work; it doesn't make the work itself faster. Use transitions, virtualization or Web Workers for that.
- Assuming it is part of the React runtime. It is a separate build plugin.

## Follow-up questions

- **How do you check what got compiled?** React DevTools shows a "Memo ✨" badge on compiled components.
- **Should a new project use it?** Yes, it is the recommended default, and frameworks like Next.js and Expo support it in their config.
- **Does it replace `React.memo` for expensive children?** Usually yes, because it memoizes the JSX passed to the child and the props themselves.

## Quick recap

- The React Compiler adds memoization automatically at build time.
- It makes most manual `memo`, `useMemo` and `useCallback` unnecessary.
- It only compiles code that follows the Rules of React.
- Opt out with `"use no memo"`; adopt gradually with annotation mode.
