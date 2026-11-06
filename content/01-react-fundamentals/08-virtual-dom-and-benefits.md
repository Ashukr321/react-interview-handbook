---
title: "Explain the virtual DOM and its benefits"
asked_as: ["What is Virtual DOM and how does it work?"]
tags: ["virtual-dom", "reconciliation", "performance"]
difficulty: "medium"
---

## Short answer

The virtual DOM is a lightweight, in-memory JavaScript representation of the UI: a tree of plain objects (React elements) describing what the DOM should look like. When state changes, React builds a new tree, diffs it against the previous one (reconciliation), and applies only the minimal set of changes to the real DOM. Its main benefit is that you write simple declarative code while React handles efficient, batched DOM updates.

## Explanation

Imagine an architect editing blueprints instead of knocking down walls. Changing paper is cheap; once the final blueprint is compared to the old one, builders only rebuild the parts that differ.

### How it works

```text
 state change
      |
      v
 1. Render: components return a NEW virtual tree
      |
      v
 2. Diff: compare new tree with previous tree (reconciliation)
      |
      v
 3. Commit: apply only the differences to the real DOM
      |
      v
 4. Browser repaints changed parts
```

A React element is just an object:

```js
{ type: "button", props: { className: "primary", children: "Save" } }
```

Creating and comparing thousands of these objects is cheap compared with touching real DOM nodes, which can trigger layout recalculation and repaint.

### Diffing heuristics

- Different element **type** (`div` to `span`, `A` to `B`) means tear down and rebuild that subtree.
- Same type means keep the node and update changed attributes only.
- **Keys** identify list items so React can move, insert or remove them correctly.

These rules give an O(n) algorithm instead of the O(n^3) cost of a general tree diff.

### Benefits

| Benefit | Why |
|---------|-----|
| Declarative code | You describe the end state; React works out the DOM operations. |
| Batched, minimal updates | Fewer DOM writes and layout thrashes. |
| Cross-platform | The same tree can target DOM, native views or a server string. |
| Enables Fiber features | Work on the tree can be split, paused and prioritised. |

### Honest caveats

The virtual DOM is not "faster than the DOM"; it adds overhead. Hand-tuned DOM code can beat it, and frameworks like Svelte or Solid skip it entirely. React's claim is "fast enough by default" with a much simpler programming model.

## Example

```jsx
import { useState } from "react";

export default function Clock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  return (
    <div className="card">
      <h2>Current time</h2>             {/* unchanged: never touched */}
      <p>{time}</p>                     {/* only this text node updates */}
      <button onClick={() => setTime(new Date().toLocaleTimeString())}>
        Refresh
      </button>
    </div>
  );
}
```

## Common mistakes

- Saying the virtual DOM is a copy of the real DOM kept in sync. It is a description of desired UI, rebuilt on each render.
- Claiming it makes React faster than vanilla JS. It makes updates efficient enough while keeping code simple.
- Confusing the virtual DOM with the shadow DOM (a browser feature for style and markup encapsulation in Web Components).
- Using array indexes as keys for reorderable lists, which breaks the diff.

## Follow-up questions

- **Virtual DOM vs shadow DOM?** Virtual DOM is a React in-memory diffing technique; shadow DOM is a browser API for encapsulating a component's DOM and styles.
- **What role does Fiber play?** Fiber is the reconciler that walks the tree in interruptible units of work, enabling concurrent rendering.
- **Does the React Compiler replace the virtual DOM?** No. It auto-memoizes components to skip unnecessary renders; diffing still happens.

## Quick recap

- Virtual DOM = tree of plain JS objects describing the UI.
- New tree, diff, minimal DOM patch.
- Type checks and keys make diffing O(n).
- Main win is a simple declarative model, not raw speed.
