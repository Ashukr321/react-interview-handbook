---
title: "Flow of data in React"
tags: ["data-flow", "props", "state", "context"]
difficulty: "easy"
---

## Short answer

React uses **unidirectional (one-way) data flow**: data moves **down** the component tree from parent to child through props, and changes move **up** through callbacks that children call to ask the parent to update its state. The component that owns the state is the single source of truth. Context and state libraries let data skip levels, but the direction stays the same: state changes trigger re-renders that flow downward.

## Explanation

Think of a waterfall: water (data) always flows downhill. If someone downstream wants more water, they cannot push it uphill; they send a message (callback) to the person at the top who controls the gate (state).

```text
            App  [state: user]
            /           \
     props: user     props: onLogout
         /                 \
    Header               Settings
    (reads user)         (calls onLogout())
                               |
                 event -> callback -> App.setUser(null)
                               |
             App re-renders -> new props flow down
```

### Ways data moves

| Mechanism | Direction | Use for |
|-----------|-----------|---------|
| Props | Parent to child | Most data passing |
| Callback props | Child to parent (request) | User actions, form changes |
| Lifting state up | Shared between siblings via parent | Coordinated components |
| Context | Ancestor to any descendant | Theme, auth, locale |
| Store (Redux Toolkit, Zustand) | Global, via selectors | Large shared client state |
| Server data (TanStack Query, RSC) | Server to components | API data |

### Why one-way?

- **Predictable**: to find why something changed, look up the tree for the state owner.
- **Easier debugging**: no hidden two-way bindings updating each other.
- **Performance**: React knows exactly which subtree re-renders when state changes.

Compare with Angular's classic two-way binding, where a model and view update each other automatically, which is convenient but harder to trace in large apps.

## Example

```jsx
import { useState } from "react";

function TodoInput({ onAdd }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(text);   // data goes UP via callback
        setText("");
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button>Add</button>
    </form>
  );
}

function TodoList({ todos }) {
  return <ul>{todos.map((t) => <li key={t.id}>{t.text}</li>)}</ul>; // data comes DOWN via props
}

export default function App() {
  const [todos, setTodos] = useState([]); // single source of truth
  return (
    <>
      <TodoInput onAdd={(text) => setTodos((prev) => [...prev, { id: crypto.randomUUID(), text }])} />
      <TodoList todos={todos} />
    </>
  );
}
```

## Common mistakes

- Mutating props inside a child. Props are read-only.
- Copying props into local state and expecting it to update automatically.
- Deep prop drilling when composition (`children`) or Context would be cleaner.
- Treating Context as two-way binding; it still updates via state setters at the provider.

## Follow-up questions

- **How can a child pass data to its parent?** By calling a callback prop the parent provided.
- **How do siblings communicate?** Through shared state in their common parent, or a shared context/store.
- **Does Redux break one-way flow?** No. Redux enforces it: view dispatches action, reducer updates store, view re-renders.

## Quick recap

- Data flows down via props; requests flow up via callbacks.
- The state owner is the single source of truth.
- Context and stores skip levels but keep one-way flow.
- One-way flow makes apps predictable and debuggable.
