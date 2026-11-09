---
title: "Which updates should be wrapped inside startTransition?"
tags: ["starttransition", "usetransition", "concurrent", "actions"]
difficulty: "medium"
---

## Short answer

Wrap updates where the user can tolerate a short delay and the render is expensive or may suspend: switching tabs or routes, applying filters or sorts to large data, rendering search results, and async Actions like form submissions (React 19). Don't wrap updates that need **instant feedback**, such as a controlled input's text, checkbox ticks, hover or drag positions, or opening a menu, and don't wrap anything that isn't a React state update.

## Why it happens

`startTransition` tells React that an update is non-urgent. React then renders it at lower priority, lets urgent updates interrupt it, keeps the old UI visible instead of showing Suspense fallbacks for already-revealed content, and exposes `isPending`. Those are exactly the behaviors you want for heavy updates and exactly the ones you *don't* want for direct manipulation.

| Update | Transition? | Why |
| --- | --- | --- |
| Controlled `<input>` value | ❌ | Text must appear on every keystroke; React won't let a transition drive a controlled input smoothly |
| Results list derived from that input | ✅ | Can lag a bit; interruptible |
| Tab or route switch | ✅ | Keep the current page visible while the next one renders or loads |
| Applying dashboard filters | ✅ | Heavy re-render of many widgets |
| Form submit / mutation (React 19 Action) | ✅ | Built-in `isPending`, error handling, optimistic UI |
| Checkbox, toggle, accordion open | ❌ | Users expect immediate visual response |
| Drag, scroll, hover, animation state | ❌ | Needs every frame |
| `setTimeout`, `fetch`, DOM work alone | ❌ | Only React state updates are marked |

## How to fix it

```jsx
import { useState, useTransition } from "react";

export default function ProductsPage() {
  const [tab, setTab] = useState("all");
  const [isPending, startTransition] = useTransition();

  function selectTab(next) {
    startTransition(() => {
      setTab(next); // ✅ non-urgent: heavy tab content, may suspend
    });
  }

  function saveFavorites(formData) {
    startTransition(async () => {
      await api.saveFavorites(formData); // ✅ React 19 async Action
      startTransition(() => setTab("favorites")); // updates after await need re-wrapping
    });
  }

  return (
    <>
      <TabBar active={tab} onSelect={selectTab} pending={isPending} />
      <TabContent tab={tab} onSave={saveFavorites} />
    </>
  );
}
```

> **⚠️ Gotcha:** The function passed to `startTransition` runs immediately. Only state updates made **synchronously** inside it (or, for async Actions, before the first `await`) are marked. Updates after an `await` or inside a `setTimeout` need their own `startTransition`.

> **💡 Interview tip:** Frameworks already do this for you. React Router v7 and the Next.js App Router wrap navigations in transitions, which is why the old page stays visible while the next one loads.

## How to verify

- The control responds instantly while `isPending` is true and the old content stays visible.
- The Profiler or React Performance Tracks show the update in a transition lane, separate from urgent commits.
- Rapid tab switching never shows intermediate stale tabs committing.

## Follow-up questions

- **`useTransition` or the standalone `startTransition`?** Use the hook inside components when you need `isPending`; use the standalone function outside components (e.g. in a store or router).
- **Can a transition be cancelled?** Not explicitly; a newer update supersedes it and stale work is discarded.
- **Does wrapping make things faster?** No. It changes priority, not cost.

## Quick recap

- Transition = "this update can wait and be interrupted".
- Yes: tabs, routes, filters, results, async Actions.
- No: input text, toggles, drag, hover, animations.
- Only synchronous `setState` calls inside the callback are marked.
