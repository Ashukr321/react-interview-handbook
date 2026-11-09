---
title: "What are some common pitfalls when using useEffect?"
tags: ["hooks", "useEffect", "bugs"]
difficulty: "medium"
---

## Short answer

The most common `useEffect` pitfalls are missing or wrong **dependencies** (stale values), **infinite loops** from setting state that is also a dependency, forgetting **cleanup** (leaks, duplicate listeners), **race conditions** in data fetching, and using effects for things that do not need them, like deriving data or handling user events. Effects exist to synchronise with external systems. If no external system is involved, you probably do not need one.

## Explanation

An effect is like a standing order with your bank: "while X is true, keep doing Y". If you set it up wrong, it either never updates (stale), fires endlessly (loop), or keeps running after you closed the account (no cleanup).

### The pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Missing deps | Effect uses old props/state | Include every reactive value; trust `eslint-plugin-react-hooks` |
| Object/function deps recreated each render | Effect runs every render | Move them inside the effect, or memoise |
| Setting state that is a dependency | Infinite render loop | Use functional updates or rethink the dependency |
| No cleanup | Leaks, double subscriptions, timers firing after unmount | Return a cleanup function |
| Fetch race conditions | Older response overwrites newer | Ignore flag or `AbortController` |
| Derived state in effect | Extra render, flicker, out-of-sync values | Compute during render (`useMemo` if expensive) |
| Event logic in effect | Logic fires on mount or on unrelated changes | Put it in the event handler |
| `async` effect function | Returns a promise, not a cleanup | Define an async function inside and call it |

### StrictMode double-run

In development, React mounts, unmounts and remounts components to prove your cleanup works. If something breaks, the bug is in your effect, not in StrictMode.

### Non-reactive logic

When an effect needs the latest value of something without re-running on it (e.g. a theme used in a log), use `useEffectEvent` (stable in React 19.2) to read it.

## Example

```jsx
import { useEffect, useState } from "react";

// Bad: derived state + missing cleanup + race condition
function BadUser({ userId, first, last }) {
  const [fullName, setFullName] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => setFullName(`${first} ${last}`), [first, last]); // unnecessary effect

  useEffect(() => {
    fetch(`/api/users/${userId}`).then((r) => r.json()).then(setUser); // may race
  }, [userId]);

  return <p>{fullName} {user?.email}</p>;
}

// Good
function GoodUser({ userId, first, last }) {
  const fullName = `${first} ${last}`; // derive during render
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch(`/api/users/${userId}`, { signal: controller.signal });
        setUser(await res.json());
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      }
    }
    load();
    return () => controller.abort(); // cancel stale request
  }, [userId]);

  return <p>{fullName} {user?.email}</p>;
}

// Interval with functional update avoids `count` as a dependency
function Timer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <p>{count}</p>;
}
```

> **💡 Interview tip:** For data fetching in real apps, mention that a framework loader, Server Components or TanStack Query handles caching, deduplication and races better than hand-written effects.

## Common mistakes

- Silencing the exhaustive-deps lint rule instead of fixing the dependency.
- Writing `useEffect(async () => {...})`.
- Chaining several effects that each set state to trigger the next.
- Assuming an empty array means "run once forever"; it means "no reactive dependencies".

## Follow-up questions

- **When does the cleanup run?** Before the effect re-runs with new deps, and on unmount.
- **How do you reset state when a prop changes?** Give the component a `key` tied to that prop rather than resetting in an effect.
- **`useEffect` vs `useLayoutEffect`?** Use the layout version only to measure or adjust layout before paint.

## Quick recap

- Effects sync with external systems; avoid them otherwise.
- List all dependencies; keep objects and functions stable or inside.
- Always clean up subscriptions, timers and requests.
- Derive data in render, handle events in handlers.
