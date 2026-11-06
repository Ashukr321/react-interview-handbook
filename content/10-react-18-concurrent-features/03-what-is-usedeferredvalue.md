---
title: "What is useDeferredValue?"
tags: ["concurrent", "hooks", "react-18", "performance"]
difficulty: "medium"
---

## Short answer

`useDeferredValue(value)` returns a copy of `value` that is allowed to "lag behind". On an urgent update React first re-renders with the **old** deferred value, then schedules a background, interruptible render with the new one. It is useful when you receive a value (often from props) and cannot wrap the code that sets it in a transition.

## Explanation

Imagine a sports commentator and the subtitle writer. The commentator speaks in real time (urgent value), and the subtitles catch up a moment later (deferred value). If the commentator keeps talking, the subtitle writer skips straight to the latest sentence instead of finishing every old one.

### How it works

1. User types; `query` becomes `"rea"`.
2. React renders urgently with `query = "rea"` but `deferredQuery` still `"re"`. The input updates instantly.
3. React then starts a low-priority render where `deferredQuery = "rea"`.
4. If the user types `"reac"` before step 3 finishes, React abandons that render and starts again with the newest value.

### Key details

- It only helps if the expensive child is wrapped in `memo`, so the urgent render (with the unchanged deferred value) can skip it.
- React 19 added an optional second argument, `initialValue`, used on the first render so the initial render can be cheap too.
- If the deferred render suspends, the user keeps seeing the old content instead of a fallback.
- There is **no fixed delay**. On a fast device the background render happens almost immediately.

| Feature | `useDeferredValue` | Debounce |
|---|---|---|
| Delay | Adaptive to device speed | Fixed (e.g. 300 ms) |
| Interruptible | Yes | No (the work runs when the timer fires) |
| Reduces network calls | No | Yes |

## Example

```jsx
import { useState, useDeferredValue, memo } from "react";

function Search({ items }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <ResultList items={items} query={deferredQuery} />
      </div>
    </>
  );
}

const ResultList = memo(function ResultList({ items, query }) {
  const filtered = items.filter((i) => i.title.includes(query));
  return (
    <ul>
      {filtered.map((i) => (
        <li key={i.id}>{i.title}</li>
      ))}
    </ul>
  );
});
```

## Common mistakes

- Forgetting `memo` on the slow child, so it re-renders during the urgent pass anyway and nothing improves.
- Passing a new object each render (`useDeferredValue({ q })`). The value changes every render and causes needless background renders.
- Treating it as a debounce for API calls. It does not reduce the number of requests.
- Deferring the value that feeds the input itself.

## Follow-up questions

- **How do you show that results are stale?** Compare `value !== deferredValue` and dim the old UI.
- **When should you prefer `useTransition`?** When you own the state setter; prefer `useDeferredValue` when the value arrives from props or a third-party hook.
- **Does it cause an extra render?** Yes, one urgent and one deferred render, but the deferred one is interruptible and the urgent one is cheap if the child is memoized.

## Quick recap

- Returns a lagging copy of a value.
- Urgent render first, then interruptible background render.
- Needs a memoized expensive child to pay off.
- No fixed delay and no request reduction.
- React 19 supports an `initialValue` argument.
