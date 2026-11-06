---
title: "What is event pooling in React?"
tags: ["events", "synthetic-events", "react-17", "history"]
difficulty: "medium"
---

## Short answer

Event pooling was a React 16-and-earlier optimization where SyntheticEvent objects were **reused**: after your handler returned, React reset all the event's properties to `null` and put the object back in a pool. Accessing the event asynchronously (in a `setTimeout`, promise, or a state updater function) returned `null` unless you called `e.persist()`. **React 17 removed event pooling**, so today events can be used asynchronously and `e.persist()` does nothing.

## Explanation

Pooling was like a café reusing cups: once you finished your drink, the cup was washed and handed to the next customer. If you tried to drink from it later, it was empty (or someone else's).

### Why it existed

In older browsers, creating many event objects (for example on `mousemove`) caused garbage-collection pauses. Reusing objects reduced allocations.

### Why it was removed

- Modern engines handle short-lived objects well; the performance gain was negligible.
- It confused developers constantly ("why is `e.target` null?").
- It complicated async patterns such as debouncing and functional state updates.

### Timeline

| Version | Behaviour |
|---|---|
| React 16 and earlier | Events pooled; properties nulled after handler; `e.persist()` to keep |
| React 17+ | No pooling; event object stays valid; `e.persist()` is a no-op kept for compatibility |

### Is it still asked?

Yes, mainly to check you know about the React 17 change and can explain old code that calls `e.persist()`. It is safe to remove those calls in React 17+ code.

## Example

```jsx
import { useState } from "react";

export default function Search() {
  const [query, setQuery] = useState("");

  function handleChange(e) {
    // React 16: e.target would be null inside the updater/timeout
    // without e.persist(). React 17+: works fine.
    setQuery(() => e.target.value);

    setTimeout(() => {
      console.log("delayed read:", e.target.value);
    }, 300);
  }

  return <input value={query} onChange={handleChange} />;
}
```

Legacy pattern you may still see:

```jsx
function handleChange(e) {
  e.persist(); // needed in React 16, no-op in React 17+
  debouncedSearch(e);
}
```

## Common mistakes

- Saying React "still pools events" in a modern interview.
- Adding `e.persist()` to new code by habit.
- Confusing pooling with batching. Pooling was about reusing event objects; batching is about grouping state updates.
- Even without pooling, reading `e.target.value` later can give a newer value if the user kept typing; copy the value you need (`const { value } = e.target`) at the start.

## Follow-up questions

- **What did `e.persist()` do?** It removed the event from the pool so React would not null its fields after the handler.
- **Why was pooling a problem with functional updates?** `setState(prev => ... e.target.value)` runs later during render, by which time the pooled event had been cleared.
- **Did removing pooling hurt performance?** No measurable regression was found on modern browsers, which is why the React team dropped it.

## Quick recap

- Pooling = reusing synthetic event objects, fields nulled after the handler.
- Needed `e.persist()` for async access.
- Removed in React 17; `e.persist()` is now a no-op.
- Still copy values early if the DOM may change later.
