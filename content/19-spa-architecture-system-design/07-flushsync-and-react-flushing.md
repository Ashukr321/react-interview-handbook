---
title: "What is flushSync and when does React flush updates?"
asked_as: ["What is React Flush?"]
tags: ["flushSync", "batching", "rendering", "react-dom"]
difficulty: "hard"
---

## Short answer

"Flushing" means React actually processing queued state updates: rendering and committing them to the DOM. Normally React batches all updates in an event and flushes them once at the end. `flushSync(fn)` from `react-dom` forces the updates inside `fn` to be rendered and committed synchronously, so the DOM is updated by the next line of code. It is an escape hatch for things like scrolling to or focusing a just-added element.

## Explanation

Imagine a postman who collects all letters from your street and delivers them in one trip (batching). `flushSync` is calling a courier: "deliver this one right now, I need it before I continue."

### When React flushes on its own

| Update source | When it is flushed |
|---|---|
| Discrete events (click, keydown, input) | Synchronous priority, flushed right after the event handler (in a microtask) |
| Continuous events (scroll, mousemove) | Batched, flushed at a slightly lower priority |
| `setTimeout`, promises, native listeners | Batched automatically (React 18+ with `createRoot`), flushed soon after |
| `startTransition` / `useDeferredValue` | Low priority, interruptible, flushed when the main thread is free |
| `flushSync(fn)` | Immediately, before `flushSync` returns |

After the commit, `useLayoutEffect` runs synchronously before paint and `useEffect` runs after paint.

### When to use flushSync

- Scroll to or focus a DOM node created by the update you just made.
- Measure the DOM right after an update in an event handler.
- Integrations that need the DOM ready synchronously (for example `onbeforeprint`, some third-party libraries).

### Costs

- It opts out of batching, so overuse means more renders.
- It forces pending Suspense boundaries to show fallbacks.
- It cannot be called during render or inside a lifecycle/effect; React warns and cannot flush there.

## Example

```jsx
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

export function Chat() {
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  function send(text) {
    flushSync(() => {
      setMessages((m) => [...m, { id: crypto.randomUUID(), text }]);
    });
    // Without flushSync the new <li> would not exist yet on this line
    listRef.current.lastElementChild?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <ul ref={listRef}>{messages.map((m) => <li key={m.id}>{m.text}</li>)}</ul>
      <button onClick={() => send("Hello")}>Send</button>
    </>
  );
}
```

## Common mistakes

- Using `flushSync` to "fix" stale state reads; the real fix is reading the updated value from the updater or a ref.
- Wrapping every `setState` in `flushSync`, killing batching and performance.
- Calling it inside `useEffect` or render.
- Confusing it with `act()` in tests, which flushes work for assertions, not production code.

## Follow-up questions

- **Is there an alternative to flushSync for scrolling?** Yes: do the scroll in a `useLayoutEffect` (or a ref callback) that runs after the commit when the message list changes.
- **Does flushSync run effects?** It commits synchronously and runs layout effects; passive effects from that update are flushed too before it returns.
- **Did React 17 need flushSync less?** Updates outside React events were not batched in React 17, so they already rendered synchronously; React 18 automatic batching made `flushSync` the explicit opt-out.

## Quick recap

- Flushing = processing queued updates into a render and commit.
- React batches and flushes once per event; transitions flush later.
- `flushSync` forces a synchronous render and commit.
- Use it rarely: scroll, focus, measure right after an update.
