---
title: "Difference between startTransition and useDeferredValue?"
tags: ["concurrent", "transitions", "hooks", "comparison"]
difficulty: "medium"
---

## Short answer

Both produce low-priority, interruptible renders, but they work at different ends. `startTransition` wraps the **state update** (you control the setter). `useDeferredValue` wraps the **value** being read (you only receive it, often as a prop). Under the hood both schedule work in transition lanes.

## Explanation

Analogy: `startTransition` is the sender stamping a letter "standard post". `useDeferredValue` is the receiver deciding "I'll read this one later". Same outcome, different side of the exchange.

| Aspect | `startTransition` / `useTransition` | `useDeferredValue` |
|---|---|---|
| What you wrap | The code that calls `setState` | A value you already have |
| Needs access to setter | Yes | No |
| Pending signal | `isPending` from `useTransition` | Compare `value !== deferredValue` |
| Renders | One transition render | One urgent render with old value, then a deferred render |
| Needs `memo` to help | Not necessarily | Yes, on the expensive child |
| Async support (React 19) | Yes, async Actions | No |
| Typical place | Event handlers, routers, stores | Components receiving props or hook results |

### Choosing between them

- You own the state and the event handler: use `useTransition`.
- The value comes from a parent, a URL param, or a library hook you cannot change: use `useDeferredValue`.
- You need the same raw state both urgently (input) and lazily (list): you can either keep two states and update one in a transition, or keep one state and defer it. Deferring is usually less code.

### Same idea, two codings

```text
startTransition:   onChange -> setQuery (urgent) + startTransition(setFilter)
                   two pieces of state, list reads "filter"

useDeferredValue:  onChange -> setQuery (urgent)
                   list reads useDeferredValue(query)
```

## Example

```jsx
import { useState, useTransition, useDeferredValue, memo } from "react";

// A: you own the setter
function WithTransition() {
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          startTransition(() => setFilter(e.target.value));
        }}
      />
      {isPending && <small>Updating...</small>}
      <BigList filter={filter} />
    </>
  );
}

// B: you only receive the value
function Results({ query }) {
  const deferred = useDeferredValue(query);
  return <BigList filter={deferred} />;
}

const BigList = memo(function BigList({ filter }) {
  /* expensive rendering */
  return <div>{filter}</div>;
});
```

## Common mistakes

- Using both on the same update path. It adds a render without benefit.
- Assuming `useDeferredValue` has a delay like debounce. It renders as soon as the browser is free.
- Using `useDeferredValue` without `memo` and concluding "it doesn't work".
- Saying one is "faster". Neither reduces work; both improve responsiveness.

## Follow-up questions

- **Which one is used by routers?** Router libraries (React Router, Next.js App Router) wrap navigations in `startTransition` so the old page stays visible.
- **Can `useDeferredValue` show a Suspense fallback?** No. If the deferred render suspends, React keeps showing the previous value's UI.
- **Do they share the same priority?** Yes, both use transition lanes, so they are interrupted by the same urgent updates.

## Quick recap

- `startTransition` wraps updates; `useDeferredValue` wraps values.
- Use the first when you own the setter, the second when you don't.
- `isPending` vs `value !== deferred` for stale UI.
- Both are interruptible and avoid fallbacks for already-shown content.
