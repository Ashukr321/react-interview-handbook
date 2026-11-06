---
title: "How does React compare two Virtual DOM trees?"
tags: ["diffing", "virtual-dom", "reconciliation"]
difficulty: "medium"
---

## Short answer

React compares trees top-down, level by level, never across levels. At each position it checks the element `type` and `key`: if they match, it reuses the existing fiber and DOM node and compares props; if they differ, it destroys the old subtree and builds a new one. Strictly speaking, React compares the **new React elements** your components return against the **current fiber tree**, not two full Virtual DOM snapshots.

## Explanation

### The comparison rules

| Old | New | Result |
|---|---|---|
| `<div className="a">` | `<div className="b">` | Keep DOM node, update `className` only |
| `<div>` | `<span>` | Unmount div subtree, mount span subtree |
| `<Card user={a} />` | `<Card user={b} />` | Keep instance and state, re-render with new props |
| `<Card />` | `<Profile />` | Unmount Card (cleanup effects), mount Profile |
| `"Hello"` text | `"Hi"` text | Update text node content |
| `[<li key="1">, <li key="2">]` | `[<li key="2">, <li key="1">]` | Reuse both, move one |

### Prop comparison on host elements

In `completeWork`, React diffs old and new props for DOM elements. Only changed attributes, styles (per style key) and event listeners are recorded; unchanged props cost nothing in the DOM.

### Why level-by-level

A perfect tree-edit-distance algorithm is O(n³): for 1,000 nodes that's a billion operations. React gives up detecting cross-level moves in exchange for O(n). In practice UIs rarely move a subtree to a different parent, and when they do, rebuilding it is acceptable.

```text
       old                       new
      <div>                     <div>          same type: keep, diff props
     /     \                   /     \
  <Nav>   <Main>          <Nav>   <Aside>      Main != Aside: unmount Main, mount Aside
            |                         |
         <List>                    <List>      NOT reused: parent was replaced
```

## Example

```jsx
import { useState } from "react";

export default function Demo() {
  const [wrapped, setWrapped] = useState(false);
  const counter = <Counter />;

  // Toggling changes the parent type (div <-> section),
  // so Counter is unmounted and its state resets to 0.
  return (
    <>
      <button onClick={() => setWrapped((w) => !w)}>Toggle wrapper</button>
      {wrapped ? <section>{counter}</section> : <div>{counter}</div>}
    </>
  );
}

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

## Common mistakes

- Assuming React compares HTML strings or does a deep equality check of whole trees. It compares `type`, `key` and props, position by position.
- Changing a wrapper element conditionally and being surprised that child state resets.
- Expecting React to notice a subtree moved to a new parent and preserve it. It won't.

> **💡 Interview tip:** Saying "React diffs elements against the current fiber tree" signals you know the modern implementation, not just the 2013 blog-post description.

## Follow-up questions

- **How does React compare `type`?** By reference (`===`). Two different function components with identical code are still different types.
- **Is `style` compared deeply?** It is diffed key by key on host elements, but a new `style` object still counts as a changed prop for `memo` purposes.
- **What about portals?** They reconcile like normal children; only the commit target container differs.

## Quick recap

- Compare level by level, position by position.
- Different `type` → replace subtree; same `type` → update props.
- Keys identify children in lists.
- Elements are diffed against the current fiber tree, in O(n).
