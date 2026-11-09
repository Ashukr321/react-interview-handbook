---
title: "Redux Architecture"
tags: ["redux", "architecture", "data-flow", "middleware"]
difficulty: "medium"
---

## Short answer

Redux follows a **unidirectional data flow** with a few parts: the **View** dispatches an **Action**; the action passes through **Middleware** (for async and side effects); the **Store** calls the root **Reducer** with the current state and action; the reducer returns a new state; the store notifies subscribers; and the **View** reads updated values through **selectors** and re-renders. Data always moves in one direction, which makes the app predictable.

## Explanation

Picture a restaurant. The customer (View) gives an order slip (Action) to a waiter (dispatch). The manager (Middleware) may call a supplier first (API). The chef (Reducer) prepares the dish following the recipe exactly (pure function). The pass (Store) holds the finished dishes, and each table only gets notified about its own order (selectors).

### The flow

```text
   +-----------+   dispatch(action)   +-------------+
   |   View    | -------------------> | Middleware  |  thunk / listener / saga / logger
   | (React)   |                      +-------------+
   +-----------+                             |
        ^                                    v
        |                             +-------------+
        |  useSelector                |   Store     |  getState / dispatch / subscribe
        |  (re-render if changed)     +-------------+
        |                                    |
        |                                    v
        |                             +-------------+
        +---------- new state <------ |  Reducers   |  (state, action) => newState
                                      +-------------+
```

### Parts and responsibilities

| Part | Responsibility | Rule |
|---|---|---|
| Action | Describes what happened | Plain, serializable object with `type` |
| Action creator | Builds actions | `createSlice` generates them |
| Dispatch | Sends actions to the store | The only way to trigger an update |
| Middleware | Intercepts actions for side effects | Async lives here, never in reducers |
| Reducer | Computes the next state | Pure, immutable, synchronous |
| Store | Holds state, runs reducers, notifies subscribers | One per app |
| Selector | Reads and derives data | Memoize derived data with `createSelector` |
| View | Renders state, dispatches actions | Uses `useSelector` / `useDispatch` |

### Organizing a real app (RTK style)

- One slice per feature (`authSlice`, `cartSlice`) combined in `configureStore`.
- RTK Query API slice for server data.
- Selectors exported from each slice file as its public API.

## Example

```jsx
import { configureStore, createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Middleware layer: async thunk
export const fetchTodos = createAsyncThunk("todos/fetch", async () => {
  const res = await fetch("/api/todos");
  return res.json();
});

// Reducer layer
const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [], status: "idle" },
  reducers: {
    todoToggled(state, action) {
      const t = state.items.find((i) => i.id === action.payload);
      if (t) t.done = !t.done;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => { state.status = "loading"; })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      });
  },
});

// Logger middleware, to show where middleware sits
const logger = (storeApi) => (next) => (action) => {
  console.log("dispatching", action.type);
  return next(action);
};

// Store layer
export const store = configureStore({
  reducer: { todos: todosSlice.reducer },
  middleware: (getDefault) => getDefault().concat(logger),
});

// Selector layer
export const selectOpenTodos = (s) => s.todos.items.filter((t) => !t.done);
```

## Common mistakes

- Doing API calls inside reducers instead of middleware.
- Putting non-serializable values in actions or state.
- Letting components compute derived data from raw state everywhere instead of shared selectors.
- Calling `dispatch` inside a reducer.

## Follow-up questions

- **Why must reducers be pure?** So the same input always gives the same output, enabling time travel, replay, testing and reliable change detection.
- **What is the middleware signature?** `store => next => action => result`; call `next(action)` to pass the action along.
- **Is the selector example above a problem?** `filter` returns a new array every call, so `useSelector` would re-render every dispatch; wrap it in `createSelector`.

## Quick recap

- View dispatches action, middleware handles effects, reducer computes state.
- Store notifies subscribers; selectors pick data.
- One-way flow keeps changes traceable.
- Async in middleware, never in reducers.
