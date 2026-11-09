---
title: "Difference between Redux and Flux"
tags: ["redux", "flux", "architecture", "comparison"]
difficulty: "medium"
---

## Short answer

Flux is the **architecture pattern** Facebook introduced for one-way data flow: Actions go through a central **Dispatcher** to **multiple Stores**, which hold state and logic and emit change events to Views. Redux is a **library** inspired by Flux (and Elm) that simplifies it: there is **no dispatcher**, there is a **single store**, and state changes are made by **pure reducer functions** that return new immutable state. Both keep data flowing in one direction.

## Explanation

Flux is like a company with several department heads (stores), each keeping their own records and listening to a central announcement system (dispatcher). Redux merges the departments into one ledger, and replaces the department heads with written rules (reducers) that anyone can test.

### Flux flow

```text
Action -> Dispatcher -> Store A, Store B, Store C -> change event -> View
  ^                                                                   |
  +-------------------------- user interaction <----------------------+
```

### Redux flow

```text
Action -> dispatch -> (middleware) -> root reducer -> single Store -> View
```

### Comparison

| Aspect | Flux | Redux |
|---|---|---|
| Type | Architecture pattern (plus a small `flux` package) | Library |
| Stores | Many stores, one per domain | One store, split into slice reducers |
| Dispatcher | Central singleton dispatcher | None; the store's `dispatch` does it |
| State updates | Stores mutate their own state and emit change events | Pure reducers return new immutable state |
| Store dependencies | `waitFor()` to order updates between stores | Not needed; reducers are composed |
| Logic location | Inside stores | Reducers (sync) and middleware (async) |
| Debugging | Basic | Redux DevTools, time travel, action replay |
| Hot reloading | Hard, state lives in store objects | Easy, reducers are swappable functions |
| Status today | Legacy, archived by Facebook | Actively maintained, used via Redux Toolkit |

### What they share

- Unidirectional data flow.
- Actions as plain objects describing events.
- Views do not modify state directly.

## Example

```js
// Flux-style store (simplified)
import { Dispatcher } from "flux";
import { EventEmitter } from "events";

const dispatcher = new Dispatcher();
let todos = [];
const TodoStore = Object.assign(new EventEmitter(), {
  getAll: () => todos,
});

dispatcher.register((action) => {
  if (action.type === "ADD_TODO") {
    todos = [...todos, action.text];
    TodoStore.emit("change"); // store emits; views re-read state
  }
});

dispatcher.dispatch({ type: "ADD_TODO", text: "Learn Flux" });
```

```js
// Redux equivalent with RTK
import { createSlice, configureStore } from "@reduxjs/toolkit";

const todosSlice = createSlice({
  name: "todos",
  initialState: [],
  reducers: {
    addTodo: (state, action) => {
      state.push(action.payload);
    },
  },
});

const store = configureStore({ reducer: { todos: todosSlice.reducer } });
store.dispatch(todosSlice.actions.addTodo("Learn Redux"));
```

## Common mistakes

- Calling Flux a library like Redux; it was primarily a pattern.
- Saying Redux has a dispatcher component; it only has the store's `dispatch` method.
- Claiming Redux "has no stores" instead of "has exactly one store".
- Mixing up Flux's mutable store state with Redux's immutable state.

## Follow-up questions

- **Why did Redux win over Flux?** Simpler mental model, one store, pure reducers enabling time travel and hot reloading, and great tooling.
- **What is `waitFor` in Flux?** A dispatcher method letting one store wait for another to process the action first; Redux avoids it through reducer composition.
- **Which other library follows Flux ideas?** Vuex/Pinia and NgRx follow similar action-based, one-way patterns.

## Quick recap

- Flux is a pattern; Redux is a library inspired by it.
- Flux: dispatcher + many stores; Redux: no dispatcher, one store.
- Redux uses pure reducers and immutable updates.
- Both enforce one-way data flow.
