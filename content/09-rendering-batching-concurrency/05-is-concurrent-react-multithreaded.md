---
title: "Does concurrent rendering make React multithreaded?"
tags: ["concurrent", "main-thread", "misconceptions"]
difficulty: "medium"
---

## Short answer

No. React still runs entirely on the browser's single main thread. "Concurrent" means **concurrency, not parallelism**: React interleaves several tasks by splitting render work into small chunks and yielding control back to the browser between them. No two pieces of React work ever execute at the same instant, and no Web Workers are involved.

## Explanation

### Concurrency vs parallelism

| | Concurrency (React) | Parallelism (multithreading) |
|---|---|---|
| Threads | One (main thread) | Several |
| How tasks progress | Interleaved: A, B, A, B | Simultaneously: A and B at once |
| Requires | Ability to pause/resume work | Multiple cores, shared memory or messaging |
| Example | React time slicing, async/await | Web Workers, Rust threads |

Analogy: one cashier serving two queues by alternating customers (concurrency) versus two cashiers working at the same time (parallelism). React is the single cashier who's very good at switching.

### How React achieves concurrency on one thread

```text
main thread timeline:
| React 5ms | browser: input + paint | React 5ms | click handler | React 5ms | commit |
```

1. Fiber stores render progress in heap objects, so React can stop between fibers.
2. `workLoopConcurrent` checks `shouldYield()` after each fiber.
3. The Scheduler posts a `MessageChannel` macrotask to continue, letting the browser handle events and paint in between.
4. Urgent updates can preempt and restart the background render.

### Why not real threads?

- Components read and write shared JS state, closures, and context; moving them to another thread would require serializing everything.
- Workers can't touch the DOM.
- The programming model (just call functions) would break.

So a single slow component (e.g. a 300 ms loop) still blocks the thread: React can't yield in the middle of your function.

## Example

```jsx
import { useState, useDeferredValue, memo } from "react";

export default function Search() {
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <Results query={deferred} />
    </>
  );
}

// Rendered in slices on the SAME thread; React yields between <Row> fibers.
const Results = memo(function Results({ query }) {
  return (
    <ul>
      {Array.from({ length: 3000 }, (_, i) => (
        <Row key={i} text={`${query} ${i}`} />
      ))}
    </ul>
  );
});

function Row({ text }) {
  return <li>{text}</li>;
}

// For truly CPU-heavy work (parsing, image processing), use a Web Worker,
// then set the result in state: that is real parallelism, outside React.
```

## Common mistakes

- Answering "yes, React 18 renders in parallel".
- Assuming concurrent rendering fixes CPU-bound code inside a single component. Split the work or move it to a worker.
- Confusing `async` components or Suspense data fetching with multithreading. Network waits are I/O, not extra threads.

> **💡 Interview tip:** Use the phrase "cooperative scheduling on the main thread" and contrast concurrency with parallelism.

## Follow-up questions

- **Can React Server Components run in parallel?** On the server, independent async components can await data concurrently, but that's still a single JS thread with async I/O.
- **How do you do real parallel work in a React app?** Web Workers (e.g. with Comlink), WebAssembly threads, or the server.
- **Does React Native's new architecture use multiple threads?** The native side has UI and background threads, but the React reconciler still runs on the single JS thread.

## Quick recap

- Concurrent ≠ parallel.
- One main thread; React interleaves work by yielding.
- Fiber + Scheduler make pausing possible.
- A single slow component still blocks; use workers for heavy CPU work.
