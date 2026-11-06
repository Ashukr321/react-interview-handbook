---
title: "Explain the concept of lifting state up"
tags: ["state", "data-flow", "props"]
difficulty: "easy"
---

## Short answer

Lifting state up means moving state from child components to their **closest common parent** when two or more siblings need to share or stay in sync with the same data. The parent owns the state and passes the value down as props, along with callback functions that children call to request changes. This keeps a single source of truth and fits React's one-way data flow.

## Explanation

Picture two kids each keeping their own score in a game: their numbers drift apart. Hand the scoreboard to the referee (the parent), and both kids just read it and shout updates to the referee.

```text
 Before:                         After:
   Parent                          Parent  [activeIndex state]
   /     \                         /    \
 PanelA   PanelB                PanelA   PanelB
 [isOpen] [isOpen]              (isActive, onShow) props
 (can both be open)             (only one open at a time)
```

### Steps

1. Remove the state from the children.
2. Add it to the nearest common ancestor.
3. Pass the value down as props.
4. Pass a callback down so children can request updates.

### When to lift and when not to

- Lift when siblings must coordinate (accordion, filter + list, temperature converter).
- Do not lift higher than necessary: state too high causes extra re-renders and prop drilling.
- If many distant components need it, consider Context or a store instead.

## Example

```jsx
import { useState } from "react";

function Panel({ title, isActive, onShow, children }) {
  return (
    <section>
      <h3>{title}</h3>
      {isActive ? <p>{children}</p> : <button onClick={onShow}>Show</button>}
    </section>
  );
}

export default function Accordion() {
  const [activeIndex, setActiveIndex] = useState(0); // lifted state

  return (
    <>
      <Panel title="About" isActive={activeIndex === 0} onShow={() => setActiveIndex(0)}>
        We build things.
      </Panel>
      <Panel title="Contact" isActive={activeIndex === 1} onShow={() => setActiveIndex(1)}>
        hello@example.com
      </Panel>
    </>
  );
}
```

## Common mistakes

- Copying props into child state (`useState(props.value)`), which goes stale when the parent changes it.
- Lifting state all the way to `App` "to be safe", re-rendering the whole tree.
- Duplicating the same data in parent and child instead of keeping one owner.
- Passing the setter directly when a more meaningful callback (`onSelect(id)`) would hide implementation details.

## Follow-up questions

- **What is prop drilling and how do you avoid it?** Passing props through many intermediate layers; use composition (`children`), Context, or a store.
- **What is the opposite technique?** "Pushing state down" or colocation: move state into the smallest component that uses it to limit re-renders.
- **How does this relate to controlled components?** A child whose important state is driven by props is "controlled" by its parent.

## Quick recap

- Shared state belongs to the closest common ancestor.
- Pass value down, callbacks up.
- Single source of truth avoids sync bugs.
- Do not lift higher than needed.
