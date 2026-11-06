---
title: "What is Immer?"
tags: ["immer", "immutability", "redux-toolkit"]
difficulty: "easy"
---

## Short answer

Immer is a small library that lets you write immutable updates with normal "mutating" syntax. You change a **draft** (a Proxy of your state), and Immer records the changes and produces a new, immutable state object, reusing every part you did not touch (structural sharing). Redux Toolkit uses Immer inside `createSlice` and `createReducer`, and you can use it with `useState` via `produce` or the `use-immer` hook.

## Explanation

Immer is like editing a photocopy with tracked changes. You scribble freely on the copy (draft); at the end, Immer produces a clean new document containing only your edits, while the original stays untouched and the unchanged pages are reused, not reprinted.

### Why it exists

React and Redux detect changes by reference. Nested immutable updates by hand are verbose and fragile:

```js
// Without Immer
return {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: "Pune" },
  },
};
```

```js
// With Immer
state.user.address.city = "Pune";
```

### How it works

```text
baseState --produce(recipe)--> draft (Proxy)
                                 |
                       recipe mutates draft
                                 |
              Immer tracks which paths changed
                                 |
     nextState: new objects only along changed paths,
     everything else shares the same reference as baseState
     (and the result is deep-frozen in development)
```

### Rules

- Either **mutate the draft** or **return a new value**, never both in the same recipe.
- Returning `undefined` means "use the draft"; to set state to `undefined` return `nothing` from Immer.
- Drafts are only valid inside the recipe. Do not store them or use them in async callbacks; use `current(draft)` to log a snapshot.
- Primitive state (a number) cannot be mutated; return the new value instead.

## Example

```jsx
import { useState } from "react";
import { produce } from "immer";
import { createSlice } from "@reduxjs/toolkit";

// 1. With useState
export function TodoList() {
  const [todos, setTodos] = useState([{ id: 1, text: "Learn Immer", done: false }]);

  function toggle(id) {
    setTodos(
      produce((draft) => {
        const todo = draft.find((t) => t.id === id);
        if (todo) todo.done = !todo.done;
      })
    );
  }

  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id} onClick={() => toggle(t.id)}>
          {t.done ? "✓ " : ""}{t.text}
        </li>
      ))}
    </ul>
  );
}

// 2. Inside Redux Toolkit (Immer is built in)
const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0, history: [] },
  reducers: {
    increment(state) {
      state.history.push(state.value); // mutate draft
      state.value += 1;
    },
    reset() {
      return { value: 0, history: [] }; // or return a brand-new value
    },
  },
});
```

## Common mistakes

- Writing `state = newState` in a slice reducer; reassigning the parameter does nothing, you must `return newState`.
- Mutating the draft and also returning a different object, which throws.
- Thinking Immer makes it safe to mutate state outside a reducer or `produce`.
- Logging a draft with `console.log` and seeing a Proxy; use `current(draft)`.

## Follow-up questions

- **Does Immer hurt performance?** Slightly slower than hand-written spreads, but negligible for normal app state; avoid it for very large arrays updated in tight loops.
- **What is structural sharing?** Unchanged branches of the new state are the same objects as the old state, so memoized selectors and components skip work.
- **What is `use-immer`?** A hook (`useImmer`) that wraps `useState` so the setter accepts an Immer recipe.

## Quick recap

- Immer turns "mutating" code on a draft into immutable updates.
- It uses Proxies and structural sharing.
- Built into Redux Toolkit's `createSlice`.
- Mutate the draft or return a new value, not both.
