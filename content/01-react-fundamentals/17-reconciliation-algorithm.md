---
title: "How does React's reconciliation algorithm work?"
tags: ["reconciliation", "diffing", "keys", "fiber"]
difficulty: "hard"
---

## Short answer

Reconciliation is how React compares the new element tree from a render with the previous one to decide the minimal DOM changes. It uses two heuristics to stay O(n): elements of **different types** produce entirely new subtrees, and **keys** identify which children in a list are stable across renders. Since React 16 this work is done by the **Fiber** reconciler, which can split, pause and prioritise the diffing work.

## Explanation

Think of comparing two versions of a family photo. Instead of checking every pixel against every other pixel, you compare person by person in the same position, and name tags (keys) tell you who moved.

### Rule 1: different type means replace

```text
 Before: <div><Counter /></div>
 After:  <section><Counter /></section>
 -> div unmounted, Counter state LOST, new section + Counter mounted
```

The same applies when a component's type changes (`<UserCard>` to `<AdminCard>`).

### Rule 2: same type means update in place

- Same DOM element type: keep the node, update only changed attributes and styles.
- Same component type: keep the instance and its state, re-render with new props.

### Rule 3: children lists use keys

Without keys, React compares children by index. Inserting at the start makes every item look "changed". With stable keys, React matches old and new items by identity and only inserts the new one.

```text
 Old: [A(key=a), B(key=b)]
 New: [C(key=c), A(key=a), B(key=b)]
 -> with keys: insert C, move nothing else
 -> by index: update A->C, B->A, insert B (wasteful, state mixed up)
```

### Fiber's role

```text
 setState -> schedule update (priority lane)
          -> RENDER phase: walk fibers, call components, mark effects
             (interruptible, can yield to the browser)
          -> COMMIT phase: apply DOM mutations, run layout effects,
             then passive effects (not interruptible)
```

Fiber keeps two trees, `current` (on screen) and `workInProgress` (being built), and swaps them on commit (double buffering).

## Example

```jsx
import { useState } from "react";

function TodoItem({ text }) {
  const [done, setDone] = useState(false); // local state tied to identity
  return (
    <li>
      <input type="checkbox" checked={done} onChange={() => setDone(!done)} />
      {text}
    </li>
  );
}

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Write tests" },
    { id: 2, text: "Ship" },
  ]);

  const addFirst = () =>
    setTodos([{ id: Date.now(), text: "New task" }, ...todos]);

  return (
    <>
      <button onClick={addFirst}>Add to top</button>
      <ul>
        {todos.map((t) => (
          <TodoItem key={t.id} text={t.text} /> // key={index} would move checkmarks to the wrong item
        ))}
      </ul>
    </>
  );
}
```

## Common mistakes

- Using array index or `Math.random()` as keys. Index breaks on reorder/insert; random keys remount every render.
- Defining a component inside another component's render, creating a new type each render and resetting its state.
- Thinking reconciliation compares with the real DOM. It compares the new element tree with the previous fiber tree.

## Follow-up questions

- **How can you force a component to reset its state?** Change its `key`; React treats it as a new element.
- **Why is the general tree diff O(n^3)?** Finding the minimum edit distance between arbitrary trees is cubic; React's heuristics trade optimality for linear time.
- **What are lanes?** Fiber's priority model: updates are assigned lanes (sync, transition, idle) so urgent work can interrupt less urgent work.

## Quick recap

- Diff new element tree vs previous tree, patch the difference.
- Different type: rebuild; same type: update in place.
- Stable keys identify list items.
- Fiber makes the render phase interruptible; commit is atomic.
