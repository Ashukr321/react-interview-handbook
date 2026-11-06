---
title: "Why must a key be stable?"
tags: ["keys", "reconciliation", "lists", "performance"]
difficulty: "easy"
---

## Short answer

React uses `key` to match elements between renders. A stable key (same item, same key, every render) lets React reuse the existing component instance, its state and its DOM node. If the key changes, React treats it as a **different** element: it unmounts the old one (losing state, focus, input text) and mounts a new one, which is both slower and buggy.

## Explanation

Analogy: keys are name tags at a conference. If everyone keeps their tag, you can greet people by name even when they move seats. If tags are reshuffled every hour (index keys after sorting) or replaced with random ones, you'd reintroduce yourself to everyone.

### What happens with each kind of key

| Key | On re-render | Result |
|---|---|---|
| Stable ID (`item.id`) | Same key, same item | State and DOM reused; reorders become DOM moves |
| Array index | Same key, possibly different item after insert/sort/delete | State sticks to the wrong item |
| `Math.random()` / `crypto.randomUUID()` in render | New key every render | Everything remounts every render: lost focus, lost state, slow |
| No key | React falls back to index (with a warning) | Same issues as index |

### Why index keys break

```text
Before: [A(key 0), B(key 1)]   user types "hello" into B's input
Insert X at top
After:  [X(key 0), A(key 1), B(key 2)]
React: key 0 -> reuse A's instance for X, key 1 -> reuse B's instance for A
       "hello" now appears in A's row, B gets a fresh empty instance
```

Index keys are fine only when the list is static, never reordered or filtered, and items have no state.

### Using key intentionally

Changing the key is also a tool: `key={userId}` on a form forces a full reset when switching users.

## Example

```jsx
import { useState } from "react";

function TodoList() {
  const [todos, setTodos] = useState([
    { id: "t1", text: "Write tests" },
    { id: "t2", text: "Ship feature" },
  ]);

  function addFirst(text) {
    setTodos((t) => [{ id: crypto.randomUUID(), text }, ...t]); // id created once, at creation time
  }

  return (
    <>
      <button onClick={() => addFirst("New task")}>Add</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.text} <input placeholder="notes" />
          </li>
        ))}
      </ul>
    </>
  );
}

// Intentional reset when the entity changes
function EditUser({ user }) {
  return <UserForm key={user.id} initial={user} />;
}
```

## Common mistakes

- Generating keys in render with `Math.random()` or `uuid()`. Generate IDs when the data is created, not when it's rendered.
- Using index keys on sortable, filterable or editable lists.
- Keys only need to be unique among siblings, not globally; don't build complex global keys.
- Expecting `key` as a prop inside the child. It isn't passed; pass `id` separately.

## Follow-up questions

- **Does a key help performance?** Yes. With stable keys, reorders become DOM moves instead of destroying and recreating nodes.
- **Can you use a key on non-list elements?** Yes. Any element can take a key, commonly used to reset state.
- **What if the data has no ID?** Assign one when you load or create the data (e.g. `crypto.randomUUID()` once), and store it.

## Quick recap

- Key identifies an element across renders.
- Stable key = state and DOM preserved.
- Changed key = unmount + remount.
- Avoid index for dynamic lists, never use random keys in render.
- Changing a key on purpose resets a component.
