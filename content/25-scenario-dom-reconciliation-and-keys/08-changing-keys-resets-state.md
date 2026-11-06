---
title: "Why does changing keys cause components to lose their state?"
asked_as: ["A component is removed and added back with a different key. What happens to its state?"]
tags: ["keys", "state", "reconciliation", "component-identity"]
difficulty: "medium"
---

## Short answer

React stores state on the **Fiber**, not on the component function, and it identifies a Fiber by its **position + type + key**. When the key changes, React sees a different component: it unmounts the old one (running cleanups and discarding its state and DOM) and mounts a fresh one with initial state. Removing a component and adding it back, whether with a different key or not, has the same result: it's a brand-new instance starting from scratch.

## Why it happens

Think of a key as a seat number in a theatre. If someone's seat number changes, the usher treats them as a new guest, and their coat (state) stays with the old seat.

```text
Before:  <Profile key="alice" />  → Fiber A  { state: draft="Hi" }
After:   <Profile key="bob" />    → no Fiber with key "bob"
                                     ├─ unmount Fiber A (cleanup effects, drop state, remove DOM)
                                     └─ mount Fiber B (useState initial values, new DOM, run effects)
```

### Removed and re-added

- **Removed**: the Fiber is deleted, and its state is gone permanently.
- **Re-added with a different key**: a new Fiber with initial state. React doesn't remember the old one.
- **Re-added with the same key**: still a new instance. Keys only match against siblings in the *previous render*, not against components unmounted earlier.

The exception is when you never unmount. React's `<Activity mode="hidden">` (stable in React 19.2) hides a subtree while **preserving** its state and DOM.

## How to fix it

Decide which behavior you want.

**Want a reset?** Changing the key on purpose is the cleanest way to reset a form when the entity changes:

```jsx
export default function ChatPage({ contactId }) {
  // New contact → fresh draft, no stale text, no useEffect syncing needed
  return <ChatInput key={contactId} contactId={contactId} />;
}
```

**Want to keep state?** Then:

1. Keep keys stable (data ids, not values that change).
2. Lift the state up, or keep it in a store keyed by id, so it outlives the component.
3. Hide instead of unmounting, using `<Activity>` or CSS.

```jsx
import { Activity, useState } from "react";

export default function Tabs() {
  const [tab, setTab] = useState("edit");
  return (
    <>
      <button onClick={() => setTab("edit")}>Edit</button>
      <button onClick={() => setTab("preview")}>Preview</button>
      <Activity mode={tab === "edit" ? "visible" : "hidden"}>
        <Editor /> {/* keeps typed text while hidden */}
      </Activity>
      <Activity mode={tab === "preview" ? "visible" : "hidden"}>
        <Preview />
      </Activity>
    </>
  );
}
```

> **⚠️ Gotcha:** Rendering `{cond ? <Form key="a" /> : <Form key="b" />}` resets state on every toggle, while `{cond ? <Form /> : <Form />}` in the same position *keeps* it. Same type and position without keys means the same Fiber.

## How to verify

- Log in `useEffect(() => () => console.log("unmount"), [])`: a key change logs an unmount and then a mount.
- React DevTools Components tab: the component's state resets to initial values, and the Profiler shows a mount.
- An `<input>` loses focus because the DOM node was replaced.

## Follow-up questions

- **Is resetting via key better than a `useEffect` that resets state on prop change?** Yes. It avoids an extra render with stale state, and it resets *all* nested state.
- **Does moving a keyed item within the same list keep its state?** Yes. Same key among siblings means React moves the Fiber and its DOM.
- **Does changing the component type also reset state?** Yes. A different type at the same position always remounts.

## Quick recap

- State lives on Fibers, identified by position + type + key.
- New key → unmount old instance + mount new one with initial state.
- Removing and re-adding always creates a fresh instance.
- Use key changes to reset deliberately; use `<Activity>` or lifted state to preserve it.
