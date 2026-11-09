---
title: "What are combined reducers?"
tags: ["redux", "combineReducers", "slices", "reducer-composition"]
difficulty: "easy"
---

## Short answer

`combineReducers` merges several slice reducers into one root reducer. You pass an object like `{ auth: authReducer, cart: cartReducer }`; the resulting reducer calls each slice reducer with its own part of the state (`state.auth`, `state.cart`) and the action, then assembles the results into one state object. It lets each feature manage its own slice while the store still has one reducer. In Redux Toolkit, `configureStore({ reducer: {...} })` calls `combineReducers` for you.

## Explanation

Think of a newspaper. Each section editor (sports, business, politics) is responsible only for their own pages. The chief editor (`combineReducers`) does not write content; they hand every news item to all editors and staple the sections back into one paper.

### How it works

```text
action ---> rootReducer = combineReducers({ auth, cart, todos })
                |
                +--> authReducer(state.auth, action)   -> newAuth
                +--> cartReducer(state.cart, action)   -> newCart
                +--> todosReducer(state.todos, action) -> newTodos
                |
                v
   { auth: newAuth, cart: newCart, todos: newTodos }
   (returns the SAME root object if no slice changed)
```

### Key behaviors

- **Every reducer receives every action.** Slices ignore actions they do not handle.
- **State shape follows the keys** you pass.
- **Reference preservation**: if no slice returns a new value, the root state keeps its reference, so subscribers can skip work.
- **Slice reducers must not return `undefined`**; `combineReducers` throws to catch bugs.
- **Nesting** is allowed: a slice can itself be a combined reducer.

### Cross-slice actions

Because all slices see all actions, a `logout` action can reset several slices at once with `extraReducers`. For a full reset, wrap the root reducer.

## Example

```js
import { combineReducers, configureStore, createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null },
  reducers: {
    loggedIn: (state, action) => { state.user = action.payload; },
    loggedOut: (state) => { state.user = null; },
  },
});

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] },
  reducers: {
    itemAdded: (state, action) => { state.items.push(action.payload); },
  },
  extraReducers: (builder) => {
    // cart reacts to an action owned by auth
    builder.addCase(authSlice.actions.loggedOut, () => ({ items: [] }));
  },
});

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  cart: cartSlice.reducer,
});

export const store = configureStore({ reducer: rootReducer });
// Equivalent shorthand:
// configureStore({ reducer: { auth: authSlice.reducer, cart: cartSlice.reducer } })

store.dispatch(cartSlice.actions.itemAdded({ id: 1 }));
store.dispatch(authSlice.actions.loggedOut());
console.log(store.getState()); // { auth: { user: null }, cart: { items: [] } }
```

> **💡 Interview tip:** Mention RTK 2's `combineSlices`, which supports lazy injection of slices for code-split routes.

## Common mistakes

- Expecting a slice reducer to read another slice's state; it only gets its own part. Use thunks or selectors for cross-slice reads.
- Returning `undefined` from a slice (missing default/initial state).
- Mismatched keys between `preloadedState` and the reducer object.
- Creating deeply nested combined reducers that make selectors brittle.

## Follow-up questions

- **How do you reset the whole store on logout?** Wrap the root reducer: `(state, action) => rootReducer(action.type === "auth/loggedOut" ? undefined : state, action)`.
- **Can you write your own combineReducers?** Yes; it is just a function that loops over keys, calls each reducer and builds a new object if anything changed.
- **What is reducer injection?** Adding reducers at runtime for lazily loaded features, via `combineSlices().inject()` or `store.replaceReducer`.

## Quick recap

- `combineReducers` builds one root reducer from slice reducers.
- Each slice gets its own state key and every action.
- `configureStore` does it automatically from an object.
- Cross-slice reactions use `extraReducers`.
