---
title: "What is useOptimistic and how does optimistic UI work in React 19?"
tags: ["react-19", "useoptimistic", "optimistic-ui", "actions", "hooks"]
difficulty: "medium"
asked_as: ["How do you implement a like button that updates instantly?", "What happens to useOptimistic state if the request fails?"]
---

## Short answer

`useOptimistic(state, updateFn)` returns `[optimisticState, addOptimistic]`. While an Action is running, calling `addOptimistic(value)` shows a **temporary** state right away, as if the request already succeeded. When the Action finishes, React **throws the optimistic value away** and shows the real `state` again. If the request succeeded, the real state now contains the change; if it failed, the UI goes back to how it was, automatically.

## Explanation

Optimistic UI makes apps feel instant: a chat message appears as soon as you hit send, a like count goes up immediately. The hard part used to be the rollback: remembering the old value and restoring it on error.

`useOptimistic` avoids that because the optimistic value is **never stored**. It is a layer on top of the real state that only exists while an Action is pending.

```text
 real state:        [A, B]                       [A, B, C]  (server confirmed)
 optimistic state:  [A, B, C (sending...)]  -->  [A, B, C]
                     ^ addOptimistic(C)          action finished: layer removed
```

### Signature

```js
const [optimisticState, addOptimistic] = useOptimistic(
  state,                                // the real value (props or state)
  (currentState, optimisticValue) => next // optional reducer
);
```

`addOptimistic` must be called **inside an Action or transition**. Outside one, React warns because there is nothing to tell it when to remove the layer.

## Example

```jsx
import { useOptimistic, useState, startTransition } from "react";

export default function Chat({ sendMessage }) {
  const [messages, setMessages] = useState([]);
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (current, text) => [...current, { id: crypto.randomUUID(), text, sending: true }]
  );

  async function action(formData) {
    const text = formData.get("text");
    addOptimistic(text); // shown immediately
    const saved = await sendMessage(text); // throws on failure
    startTransition(() => setMessages((m) => [...m, saved]));
  }

  return (
    <>
      <ul>
        {optimisticMessages.map((m) => (
          <li key={m.id} style={{ opacity: m.sending ? 0.5 : 1 }}>
            {m.text} {m.sending && <small>(sending...)</small>}
          </li>
        ))}
      </ul>
      <form action={action}>
        <input name="text" />
        <button>Send</button>
      </form>
    </>
  );
}
```

## Common mistakes

- Calling `addOptimistic` outside an Action or transition, for example in a plain `onClick` without `startTransition`.
- Expecting the optimistic value to stay. It disappears when the Action ends, so you must also update the real state (or let the server data refresh).
- Using optimistic UI for actions that often fail or are risky, such as payments. Users then see something "happen" that gets undone.
- Not showing that an item is still pending. A small "sending..." hint keeps the UI honest.

## Follow-up questions

- **How do you show an error after rollback?** Catch the error in the Action and store a message with `useActionState` or `useState`, then show it next to the item.
- **Does it handle multiple pending actions?** Yes. Each `addOptimistic` call is applied in order on top of the real state until all related Actions finish.
- **How did people do this before React 19?** With manual state plus rollback in `catch`, or with library features like TanStack Query's `onMutate`.

## Quick recap

- `useOptimistic` shows a temporary value while an Action runs.
- The value is a layer, not stored state, so rollback is automatic.
- Call `addOptimistic` inside an Action or transition.
- Still update the real state when the request succeeds.
