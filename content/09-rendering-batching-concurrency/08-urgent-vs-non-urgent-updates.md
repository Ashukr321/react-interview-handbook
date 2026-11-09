---
title: "What are urgent vs non-urgent updates?"
tags: ["transitions", "useTransition", "useDeferredValue", "concurrent"]
difficulty: "medium"
---

## Short answer

Urgent updates reflect direct interaction, like typing, clicking or pressing, and users expect them to show immediately. Non-urgent updates (called **transitions**) move the UI from one view to another, like filtering results or switching tabs, and can tolerate a short delay. By default every update is urgent; you mark updates as non-urgent with `startTransition`/`useTransition`, or derive a non-urgent value with `useDeferredValue`.

## Explanation

### Comparison

| | Urgent update | Non-urgent update (transition) |
|---|---|---|
| Examples | Input value, checkbox, hover, button press feedback | Search results, tab content, charts, route navigation |
| User expectation | Instant (physical feel) | Can lag slightly; should not freeze |
| Lane | Sync / InputContinuous / Default | TransitionLane |
| Render loop | Synchronous, not time-sliced | Time-sliced, interruptible |
| Superseded by newer updates? | No, each is shown | Yes, only the latest result commits |
| Suspense behavior | Shows nearest fallback | Keeps previous UI visible |
| API | Plain `setState` | `startTransition`, `useTransition`, `useDeferredValue`, Actions |

Analogy: in a conversation, nodding when someone speaks is urgent; writing up meeting notes is non-urgent. You'd never stop nodding to finish the notes.

### Choosing the API

- **`useTransition`**: you own the state setter and want `isPending`.
- **`startTransition`** (standalone import): outside components or when you don't need `isPending`, e.g. in a router or store.
- **`useDeferredValue`**: you receive a value (prop or state) and want a lagging copy for an expensive child. React 19 also accepts an initial value: `useDeferredValue(value, initialValue)`.

```text
keystroke -> setInput (urgent) -> commit -> input shows char
          -> setQuery in transition -> background render -> commit when ready
```

## Example

```jsx
import { useState, useTransition, useDeferredValue, memo } from "react";

export default function Inbox({ emails }) {
  const [search, setSearch] = useState("");                  // urgent
  const deferredSearch = useDeferredValue(search);           // non-urgent copy
  const [folder, setFolder] = useState("inbox");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <button onClick={() => startTransition(() => setFolder("archive"))}>
        Archive {isPending && "(loading)"}
      </button>
      <EmailList emails={emails} folder={folder} search={deferredSearch} />
    </>
  );
}

const EmailList = memo(function EmailList({ emails, folder, search }) {
  const list = emails.filter((m) => m.folder === folder && m.subject.includes(search));
  return <ul>{list.map((m) => <li key={m.id}>{m.subject}</li>)}</ul>;
});
```

## Common mistakes

- Putting a controlled input's value in a transition. The input will lag or skip characters.
- Expecting `startTransition` to delay or debounce work. It starts immediately; it only lowers priority.
- Calling `setState` after an `await` inside an async transition in React 19 without wrapping it again in `startTransition`; that later update is not marked as a transition.

> **💡 Interview tip:** Give a concrete example pair: "the input value is urgent, the filtered list is a transition".

## Follow-up questions

- **Does a transition make code faster?** No. It keeps the UI responsive while the same work happens in the background.
- **What's the difference between `useTransition` and `useDeferredValue`?** The first wraps the state update; the second defers a value you received. Both use transition lanes.
- **How do transitions interact with Suspense?** A transition that suspends keeps showing the old UI rather than replacing visible content with a fallback.

## Quick recap

- Urgent = direct interaction, shown immediately.
- Non-urgent = view changes, can lag and be interrupted.
- Updates are urgent by default.
- Use `useTransition`, `startTransition`, or `useDeferredValue` for non-urgent work.
