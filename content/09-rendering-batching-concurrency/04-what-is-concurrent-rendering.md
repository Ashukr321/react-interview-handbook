---
title: "What is concurrent rendering?"
tags: ["concurrent", "react-18", "transitions", "suspense"]
difficulty: "medium"
---

## Short answer

Concurrent rendering is React's ability to prepare multiple versions of the UI at the same time and work on them interleaved: it can start a render, pause it, handle a more urgent update, and later resume or discard the original work. It's not a mode you switch on globally; in React 18+ it's activated per update by concurrent features such as `startTransition`, `useTransition`, `useDeferredValue` and Suspense, under a `createRoot` root.

## Explanation

### Key properties

| Property | Meaning |
|---|---|
| Interruptible | Render work for non-urgent lanes yields every ~5 ms and can be preempted |
| Multiple versions | The current UI stays on screen while a new version is prepared in the workInProgress tree |
| Consistent commits | The DOM is only updated in one synchronous commit once a render finishes |
| Priority-aware | Urgent updates (typing) jump ahead of transitions |
| Suspense-aware | A transition that suspends keeps showing old content instead of a fallback |

Analogy: a chef who has two dishes on the stove. They can pause stirring the slow-cooking stew to plate a quick salad, but they only serve each dish when it's completely ready.

```text
time ->
urgent:     [type "a" render+commit]        [type "b" render+commit]
transition:          [render..][yield][render..]  X discarded  [render....] -> commit
```

### What triggers concurrent behavior

| API | What it does |
|---|---|
| `startTransition` / `useTransition` | Marks updates as non-urgent (TransitionLane) |
| `useDeferredValue` | Renders a lagging copy of a value in the background |
| `<Suspense>` + transitions | Keeps old UI visible while new data/code loads |
| Streaming SSR + selective hydration | Hydrates parts concurrently, prioritizing user interactions |
| React 19 Actions (`useActionState`, form actions) | Run inside transitions automatically |

Updates not marked as transitions (clicks, input, default updates) still render synchronously, which is why React 18 adoption was backward-compatible.

## Example

```jsx
import { useState, useTransition, Suspense } from "react";

export default function App() {
  const [tab, setTab] = useState("about");
  const [isPending, startTransition] = useTransition();

  const go = (next) => startTransition(() => setTab(next));

  return (
    <>
      <nav style={{ opacity: isPending ? 0.6 : 1 }}>
        <button onClick={() => go("about")}>About</button>
        <button onClick={() => go("posts")}>Posts (slow)</button>
      </nav>
      {/* During the transition, React keeps showing the old tab
          instead of falling back to the spinner */}
      <Suspense fallback={<p>Loading…</p>}>
        {tab === "posts" ? <Posts /> : <About />}
      </Suspense>
    </>
  );
}

function About() { return <p>About us</p>; }
function Posts() { /* suspends while fetching, e.g. via use(promise) */ return <p>Posts</p>; }
```

## Common mistakes

- Calling it "Concurrent Mode". That was the experimental, all-or-nothing name; React 18 shipped opt-in concurrent features instead.
- Assuming it makes React multithreaded. It's cooperative scheduling on the main thread.
- Expecting concurrent features to speed up a single slow component. They improve responsiveness, not raw throughput.

## Follow-up questions

- **What's tearing and how does React prevent it?** Different components reading different values of an external store in one render; `useSyncExternalStore` prevents it.
- **Do effects run for discarded renders?** No, effects only run after a commit.
- **Is the initial render concurrent?** With `createRoot`, the initial render uses DefaultLane, which is not time-sliced.

## Quick recap

- React can work on multiple UI versions and interleave them.
- Activated per update by transitions, deferred values and Suspense.
- Render is interruptible; commit stays synchronous.
- Improves responsiveness, not raw speed, on a single thread.
