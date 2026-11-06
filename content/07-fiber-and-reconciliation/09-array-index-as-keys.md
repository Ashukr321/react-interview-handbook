---
title: "Why shouldn't we use array indexes as keys?"
tags: ["keys", "lists", "reconciliation"]
difficulty: "easy"
---

## Short answer

An index identifies a **position**, not an item. When the list is reordered, filtered, or items are inserted or removed anywhere except the end, the same index points to a different item, so React reuses the wrong fiber: component state, uncontrolled input values and DOM nodes stay attached to the old position. It also turns a cheap move into updates of every row. Index keys are only safe for static lists that never reorder and hold no state.

## Explanation

React matches old and new children by key. With index keys:

```text
Before:  key=0 "Apple"   key=1 "Banana"
Prepend "Cherry"
After:   key=0 "Cherry"  key=1 "Apple"   key=2 "Banana"

React sees: key 0 changed text, key 1 changed text, key 2 is new
Reality:    one item was inserted at the top
```

So React updates every existing row and appends a node at the end, instead of inserting one node at the top. Worse, any state inside row 0 (a checkbox, a typed value) now displays next to "Cherry".

### When is index acceptable?

| Condition | Index OK? |
|---|---|
| List is static and never reordered or filtered | Yes |
| Items have no state and no uncontrolled inputs | Usually |
| Items are appended only at the end | Usually |
| Sorting, filtering, prepending, deleting from middle | No |
| Drag-and-drop lists | No |

Analogy: labeling people in a queue as "1st, 2nd, 3rd". When someone cuts in line, everyone's label changes, but they're the same people.

## Example

```jsx
import { useState } from "react";

export default function Fruits() {
  const [fruits, setFruits] = useState([
    { id: "a", name: "Apple" },
    { id: "b", name: "Banana" },
  ]);

  const prepend = () => setFruits((f) => [{ id: crypto.randomUUID(), name: "Cherry" }, ...f]);

  return (
    <>
      <button onClick={prepend}>Prepend</button>

      {/* Buggy: tick Apple's checkbox, then prepend -> Cherry appears ticked */}
      <ul>
        {fruits.map((f, i) => (
          <li key={i}>
            <input type="checkbox" /> {f.name}
          </li>
        ))}
      </ul>

      {/* Correct: checkbox state follows the item */}
      <ul>
        {fruits.map((f) => (
          <li key={f.id}>
            <input type="checkbox" /> {f.name}
          </li>
        ))}
      </ul>
    </>
  );
}
```

## Common mistakes

- Thinking index keys are fine because the React warning disappeared. Silencing the warning is not the same as being correct.
- Using `index` as a "fallback" for items that lack ids instead of generating ids on load.
- Combining index with other data (`key={i + name}`) that still changes on reorder.

> **💡 Interview tip:** Demonstrate the bug with an input or checkbox. Visual state mismatch is the clearest argument, more than performance.

## Follow-up questions

- **Is omitting the key the same as using the index?** Yes, React falls back to index matching, plus a warning.
- **Are index keys faster for append-only lists?** Roughly the same as real ids; there's no gain worth the risk.
- **What's a good key source?** Database ids, slugs, or ids generated once with `crypto.randomUUID()` when the item is created.

## Quick recap

- Index = position, not identity.
- Reorders/inserts make React reuse the wrong fiber.
- Causes stale state and unnecessary DOM updates.
- Only safe for static, stateless lists.
