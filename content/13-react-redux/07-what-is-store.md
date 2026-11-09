---
title: "What is store in Redux?"
tags: ["redux", "store", "configureStore"]
difficulty: "easy"
---

## Short answer

The store is the single object that holds the entire Redux state tree. It exposes `getState()` to read state, `dispatch(action)` to request a change, and `subscribe(listener)` to be notified after updates. When you dispatch, the store runs the action through middleware and then the root reducer and saves the returned state. In modern Redux you create it with Redux Toolkit's `configureStore`, which also adds thunk middleware, DevTools and dev-only safety checks.

## Explanation

The store is like a bank vault with a single teller window. You cannot reach inside; you can only look at the balance (`getState`), hand in a transaction slip (`dispatch`), or ask to be called when something changes (`subscribe`).

### Store API

| Method | What it does |
|---|---|
| `getState()` | Returns the current state tree |
| `dispatch(action)` | Runs middleware, then the reducer, stores the result, notifies subscribers |
| `subscribe(listener)` | Registers a callback after each dispatch; returns an unsubscribe function |
| `replaceReducer(next)` | Swaps the root reducer (code splitting, hot reloading) |

### What `configureStore` adds

- Combines a `reducer` object into a root reducer automatically.
- Adds `redux-thunk` middleware.
- Enables Redux DevTools Extension.
- Adds dev-only middleware that detects state mutation and non-serializable values.
- Accepts `preloadedState` (for SSR hydration or persisted state).

### Lifecycle of a dispatch

```text
store.dispatch(action)
   -> middleware chain (thunk, logger, RTK Query...)
   -> rootReducer(currentState, action)
   -> store saves newState
   -> listeners run (react-redux checks each useSelector)
```

### One store per app

Redux recommends a single store. Split it into slices with separate reducers instead of creating multiple stores. On the server (SSR), create a new store per request so users never share state.

## Example

```js
// app/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import cartReducer from "../features/cart/cartSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
  },
  preloadedState: {
    cart: JSON.parse(localStorage.getItem("cart") ?? "null") ?? undefined,
  },
});

// Raw store API, outside React
const unsubscribe = store.subscribe(() => {
  localStorage.setItem("cart", JSON.stringify(store.getState().cart));
});

store.dispatch({ type: "cart/itemAdded", payload: { id: 1, qty: 1 } });
console.log(store.getState().cart);
unsubscribe();
```

```jsx
// main.jsx
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <Provider store={store}><App /></Provider>
);
```

## Common mistakes

- Mutating the object returned by `getState()`.
- Creating the store inside a React component, so it is rebuilt on re-render.
- Sharing one module-level store across requests in SSR, leaking data between users.
- Calling `store.getState()` inside components instead of `useSelector`, which does not subscribe and will not re-render.

## Follow-up questions

- **What happens to `preloadedState` keys without a reducer?** They are ignored with a warning; every state key needs a reducer.
- **How do you persist the store?** `redux-persist`, or a `subscribe`/listener-middleware that saves selected slices with throttling.
- **Why is `createStore` deprecated?** It still works, but the Redux team marks it deprecated to steer users to `configureStore`.

## Quick recap

- The store holds the entire state tree.
- API: `getState`, `dispatch`, `subscribe`.
- Create it with `configureStore`.
- One store per app, one per request on the server.
