---
title: "What is interruptible rendering?"
tags: ["concurrent", "transitions", "interruptible"]
difficulty: "medium"
---

## Short answer

Interruptible rendering means a non-urgent render (a transition or deferred value) can be paused or abandoned when something more important happens, such as the user typing. From the concurrency point of view, it's what lets React keep urgent updates responsive: the urgent update renders and commits first, and the background render resumes or restarts afterward with the latest state. Only renders in non-blocking lanes are interruptible.

## Explanation

### What can interrupt what

| Running render | New event | Result |
|---|---|---|
| Transition | Click / keypress (SyncLane) | Transition paused/discarded, urgent update commits first |
| Transition | Another transition on same state | Older transition is superseded; only the latest commits |
| Sync / Default render | Anything | Not interrupted; runs to completion |
| Commit phase | Anything | Never interrupted |

```text
user types "r"  -> urgent render+commit (input shows "r")
                -> transition render for results("r") starts, yields every 5ms
user types "re" -> urgent render+commit (input shows "re")
                -> results("r") work thrown away
                -> transition render for results("re") -> commit
```

Without interruption, the second keystroke would wait for the entire "r" results render to finish, and users would feel input lag.

### Behaviors you can observe

- `isPending` from `useTransition` is `true` while the background render hasn't committed.
- Intermediate transition states are skipped; users only see the final result.
- Suspense: a transition that suspends keeps the old UI on screen instead of showing a fallback.

### Rules this imposes

- Render must be pure; it may run and be discarded.
- Don't put controlled input values in a transition: input state must stay urgent.
- Use `useSyncExternalStore` for external stores so interrupted renders don't tear.

Analogy: a TV channel that's pre-loading the next show in the background but immediately switches to breaking news, then restarts the pre-load once the news is over.

## Example

```jsx
import { useState, useTransition, memo } from "react";

export default function CitySearch({ cities }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const onChange = (e) => {
    setInput(e.target.value);                         // urgent, never interrupted
    startTransition(() => setQuery(e.target.value));  // interruptible
  };

  return (
    <>
      <input value={input} onChange={onChange} />
      {isPending && <small>Updating results…</small>}
      <CityList cities={cities} query={query} />
    </>
  );
}

const CityList = memo(function CityList({ cities, query }) {
  const visible = cities.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  return <ul>{visible.map((c) => <li key={c}>{c}</li>)}</ul>;
});
```

## Common mistakes

- Wrapping the input's own `setState` in `startTransition`, causing a laggy input.
- Forgetting `memo` on the expensive child, so it also renders in the urgent pass and the benefit is lost.
- Assuming the interrupted render's partial result is shown. Nothing from it reaches the screen.

## Follow-up questions

- **How is this different from debouncing?** Debounce delays work by a fixed time; transitions start immediately and only yield when there's something more urgent, so fast devices update sooner.
- **Can a transition be starved forever?** No, lanes expire after a timeout and then render synchronously.
- **Can async functions be transitions?** In React 19, yes: `startTransition(async () => {...})` creates an Action, and `isPending` stays true until it settles.

## Quick recap

- Non-urgent renders can be paused or discarded.
- Urgent updates commit first; background work restarts with latest state.
- Only transition/deferred/retry/idle lanes are interruptible.
- Requires pure render and urgent input state.
