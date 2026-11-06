---
title: "Updating one input causes 100 components to render. Why?"
tags: ["re-renders", "state-colocation", "context", "forms", "performance"]
difficulty: "medium"
---

## Short answer

The input's state lives too high in the tree, often in a page-level component, a form-wide state object, or a context, so every keystroke re-renders everything below that owner or every consumer of that context. Fix it by colocating the state with the input, splitting contexts or using selectors, memoizing heavy siblings, or using an uncontrolled form library.

## Why it happens

```text
<CheckoutPage formState={...}>        ← setState on each keystroke
   ├─ <Header />                         renders
   ├─ <AddressForm>                      renders
   │    ├─ <Input name="street" />       renders   (the only one that needed to)
   │    └─ ... 20 more inputs            render
   ├─ <CartSummary items={...} />        renders
   └─ <Recommendations />  (80 cards)    render
```

Common root causes:

| Cause | Why it fans out |
| --- | --- |
| State lifted to the page "just in case" | Parent render → all children render |
| One big form object in `useState` | Every field shares one owner |
| Context with `value={{ form, setForm }}` | All consumers re-render on any change; a new object each render |
| Global store without selectors | Components subscribe to the whole state |
| Inline props to `memo` children | Memo is defeated, so they render anyway |

## How to fix it

1. **Colocate state.** Move the value into the input component (or its smallest common parent).
2. **Lift content up.** Pass static heavy parts as `children` so they aren't re-created.
3. **Split context** into state and dispatch providers, or by domain; memoize the `value`.
4. **Use selectors**: `useSelector(s => s.cart.total)` or Zustand `useStore(s => s.field)`.
5. **Use uncontrolled forms** (React Hook Form, or native `FormData` with React 19 form Actions) so keystrokes don't hit React state at all.
6. **Defer heavy consumers** such as live previews with `useDeferredValue`.

```jsx
import { useState } from "react";

// ❌ Before: Page owns `search`, so all 100 cards re-render per keystroke
// ✅ After: state lives only where it's used
function SearchBox({ onSubmit }) {
  const [text, setText] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(text); }}>
      <input value={text} onChange={(e) => setText(e.target.value)} />
    </form>
  );
}

export default function Page() {
  const [query, setQuery] = useState(""); // changes only on submit
  return (
    <>
      <SearchBox onSubmit={setQuery} />
      <ProductGrid query={query} /> {/* 100 cards: render on submit only */}
    </>
  );
}
```

> **💡 Interview tip:** The **React Compiler** memoizes JSX and props, so siblings with unchanged inputs skip rendering automatically. Context consumers still re-render on context changes, though, so state placement and context design still matter.

## How to verify

- React DevTools → "Highlight updates when components render" while typing; only the input should flash.
- Profiler: record a few keystrokes, then check the commit's rendered-component count and "Why did this render?".
- Measure INP or input latency in Chrome Performance with CPU throttling.

## Follow-up questions

- **Why does a context provider re-render all consumers?** Any change to `value` (by `Object.is`) notifies every `useContext` consumer; there's no built-in selector.
- **Is a controlled input itself slow?** No. The cost is what re-renders alongside it.
- **When would you keep state high?** When several distant components genuinely need it, and then you subscribe narrowly.

## Quick recap

- The state owner decides how much re-renders.
- Colocate state, lift content up as `children`.
- Split contexts, use selectors, or go uncontrolled.
- Verify with highlight updates and the Profiler.
