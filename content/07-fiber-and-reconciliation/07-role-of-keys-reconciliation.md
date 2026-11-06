---
title: "What is the role of keys during reconciliation?"
tags: ["keys", "lists", "reconciliation"]
difficulty: "easy"
---

## Short answer

Keys give each child in a list a stable identity, so React can match old and new children by identity instead of by position. With keys, React can detect insertions, deletions and reorders and reuse the correct fiber (with its state and DOM node). Keys only need to be unique among siblings, and they must stay the same for the same item across renders.

## Explanation

Without keys, React compares children by index: old child 0 with new child 0, and so on. Insert an item at the top and every position "changes", so React updates every row and state ends up attached to the wrong items.

With keys, React's list reconciliation (`reconcileChildrenArray`) does this:

1. Walk old and new children in order while keys match, updating in place.
2. Put the remaining old fibers in a `Map` by key.
3. For each remaining new child, look up its key: reuse the fiber if the key and type match, otherwise create a new one.
4. Use `lastPlacedIndex` to mark only the nodes that actually need to move.
5. Delete old fibers left in the map.

Analogy: a teacher taking attendance by student ID (key) versus by seat number (index). If a student changes seats, the ID still finds the right person.

### What a key controls

| Key behavior | Effect |
|---|---|
| Same key, same type | Fiber reused, state preserved, props updated |
| Same key, different type | Old unmounted, new mounted |
| Key disappears | Fiber deleted, effects cleaned up |
| New key | Fiber created, mounted fresh |
| Key changed on purpose | Component remounts, resetting state |

## Example

```jsx
import { useState } from "react";

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: "a1", text: "Write docs" },
    { id: "b2", text: "Fix bug" },
  ]);

  const addFirst = () =>
    setTodos((t) => [{ id: crypto.randomUUID(), text: "New task" }, ...t]);

  return (
    <>
      <button onClick={addFirst}>Add to top</button>
      <ul>
        {todos.map((todo) => (
          // Each row keeps its own input state because the key follows the item.
          <li key={todo.id}>
            {todo.text} <input placeholder="note" />
          </li>
        ))}
      </ul>
    </>
  );
}

// Keys also reset state outside lists:
// <ProfileForm key={userId} userId={userId} />
```

## Common mistakes

- Putting the key on the inner element instead of the outermost element returned from `map`.
- Generating keys during render (`key={Math.random()}`), which remounts every item on every render.
- Expecting `key` to be readable as a prop. React strips it; pass the id separately if the child needs it.

## Follow-up questions

- **Do keys need to be globally unique?** No, only among siblings in the same array.
- **Why is the key on a Fragment sometimes needed?** When mapping to multiple elements per item, use `<Fragment key={id}>` so the group has one identity.
- **Do keys improve performance?** They avoid unnecessary DOM rebuilds and preserve state correctly; correctness is the bigger benefit.

## Quick recap

- Keys give list children stable identity.
- React matches children by key, not index, when keys exist.
- Correct keys preserve state and minimize DOM operations.
- Changing a key deliberately forces a remount.
