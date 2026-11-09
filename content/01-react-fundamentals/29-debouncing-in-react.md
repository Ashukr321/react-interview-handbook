---
title: "What is debouncing and what are its applications in React?"
tags: ["debounce", "throttle", "performance", "hooks"]
difficulty: "medium"
---

## Short answer

Debouncing delays running a function until a certain amount of time has passed **since the last call**. If the call happens again within that window, the timer resets. In React it is commonly used for search-as-you-type, autosave, validation requests and window resize handlers, so you send one API call after the user pauses typing instead of one per keystroke. It is usually implemented with a `useDebounce` custom hook built on `setTimeout` and `useEffect` cleanup.

## Explanation

Debouncing is like an elevator door: it waits a few seconds after the last person walks in before closing. Every new person resets the wait.

```text
 keystrokes:  r  e  a  c  t ............
 timer:       |--x|--x|--x|--x|--------| fires once (500 ms after "t")
 API calls:                              GET /search?q=react
```

### Debounce vs throttle

| | Debounce | Throttle |
|---|----------|----------|
| Runs | After activity stops | At most once per interval during activity |
| Good for | Search input, autosave, resize end | Scroll position, drag, mouse move |
| Analogy | Elevator door | Metronome |

### Applications in React

- Search and autocomplete inputs (fewer API calls).
- Autosaving drafts.
- Async validation (is this username taken?).
- Expensive filtering of large lists.
- Window resize or layout recalculation.

### React-specific concerns

- **Keep the input responsive**: update the input's state immediately; debounce only the side effect or derived query.
- **Stable debounced functions**: a debounced function created during render is new every render, so its timer is lost. Keep it in `useRef`/`useMemo`, or debounce a value with an effect.
- **Cleanup**: clear the timer on unmount and cancel in-flight requests.
- **Alternative**: `useDeferredValue` keeps rendering responsive for expensive local work, but it does not reduce network calls; debounce does.

## Example

```jsx
import { useEffect, useState } from "react";

export function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // reset timer when value changes
  }, [value, delay]);

  return debounced;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });
    return () => controller.abort();
  }, [debouncedQuery]);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      <ul>{results.map((r) => <li key={r.id}>{r.title}</li>)}</ul>
    </>
  );
}
```

A plain JavaScript debounce for reference:

```js
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
```

## Common mistakes

- Calling `debounce(handler)` directly in the component body, producing a new debounced function every render.
- Debouncing the input's own `value` state, making typing feel laggy.
- Forgetting to clear timers on unmount, causing state updates on unmounted components.
- Ignoring race conditions: an older slow response can still overwrite a newer one without abort or ignore logic.

## Follow-up questions

- **How do you implement throttle?** Track the last run time and skip calls until the interval has passed, or use a trailing timer.
- **Leading vs trailing debounce?** Leading fires on the first call then ignores until quiet; trailing (default) fires after the quiet period.
- **Would you use a library?** `lodash.debounce` or `use-debounce` are fine; keep the instance stable with `useMemo` and cancel it in cleanup.

## Quick recap

- Debounce runs a function after calls stop for a set delay.
- Use it for search, autosave, validation and resize.
- Keep the input immediate; debounce the effect.
- Keep debounced functions stable and clean up timers.
