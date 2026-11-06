---
title: "What is useTransition?"
tags: ["concurrent", "transitions", "hooks", "react-18"]
difficulty: "medium"
---

## Short answer

`useTransition` is a hook that returns `[isPending, startTransition]`. Updates wrapped in `startTransition` become low-priority transitions, and `isPending` is `true` while that transition is still rendering (or, in React 19, while an async action is running). It lets you keep the UI responsive and show a subtle "working" state at the same time.

## Explanation

`useTransition` is `startTransition` plus a status light. When you call the returned `startTransition`, React does two things:

1. Immediately schedules an **urgent** update that flips `isPending` to `true`.
2. Schedules your updates in a **transition lane**. When that render commits, `isPending` goes back to `false`.

That is why you can dim a list or show a small spinner without blocking the input.

Real-life analogy: a ticket counter that hands you a token number right away (`isPending`) and calls you when your order is ready, instead of making the whole queue wait.

### React 19 additions

- The callback can be `async`. `isPending` stays `true` until the promise settles, which makes it perfect for form submissions ("Actions").
- Errors thrown in an action propagate to the nearest error boundary.
- State updates after an `await` need their own `startTransition` wrapper (a current limitation).

### When to reach for it

| Use case | Why it helps |
|---|---|
| Switching tabs with heavy content | Old tab stays interactive while the new one renders |
| Filtering a large list | Input stays snappy; list updates when ready |
| Router navigation | Old page stays visible instead of a blank fallback |
| Submitting a form (React 19) | Built-in pending state without manual `loading` flags |

## Example

```jsx
import { useState, useTransition } from "react";

function Tabs() {
  const [tab, setTab] = useState("about");
  const [isPending, startTransition] = useTransition();

  function selectTab(next) {
    startTransition(() => {
      setTab(next);
    });
  }

  return (
    <div>
      <nav style={{ opacity: isPending ? 0.6 : 1 }}>
        <button onClick={() => selectTab("about")}>About</button>
        <button onClick={() => selectTab("posts")}>Posts (slow)</button>
      </nav>
      {tab === "about" ? <About /> : <SlowPosts />}
    </div>
  );
}

// React 19: async action
function SaveButton({ save }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => await save())}
    >
      {isPending ? "Saving..." : "Save"}
    </button>
  );
}
```

## Common mistakes

- Using it for controlled input values. Text input updates must be urgent or typing will feel broken.
- Calling `startTransition` from `useTransition` outside a component or conditionally calling the hook. It follows the rules of hooks.
- Expecting `isPending` to cover a `fetch` in React 18. In React 18 the callback must be synchronous; async support arrived in React 19.
- Showing a full-page spinner on `isPending`, which defeats the purpose of keeping old UI visible.

## Follow-up questions

- **Why is `isPending` itself not part of the transition?** It is set via an urgent update so the indicator appears immediately, before the slow render begins.
- **What if two transitions start quickly?** React batches them into the same or a newer transition and renders only the latest state; intermediate states may never commit.
- **How does it interact with Suspense?** If the transition suspends, React keeps the current content and `isPending` stays `true` until the data resolves.

## Quick recap

- Returns `[isPending, startTransition]`.
- Marks updates as interruptible, low priority.
- `isPending` gives an instant, urgent feedback signal.
- React 19 supports async callbacks (Actions).
- Never wrap a controlled input's own value update.
