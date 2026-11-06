---
title: "Explain Redux Toolkit Architecture"
tags: ["redux-toolkit", "redux", "architecture", "rtk-query"]
difficulty: "medium"
---

## Short answer

Redux Toolkit (RTK) keeps Redux's one-way data flow (store, actions, reducers, selectors) but packages it into a few APIs: `configureStore` builds the store with good defaults, `createSlice` generates reducers and action creators together, `createAsyncThunk` handles async flows, `createEntityAdapter` normalizes collections, and RTK Query handles fetching and caching server data. Components talk to it through `useSelector` and `useDispatch`.

## Explanation

Think of the store as a bank vault. You never walk in and change balances yourself. You fill in a slip (action), a clerk who follows strict rules (reducer) updates the ledger, and anyone who needs a number reads it through a window (selector).

### The building blocks

| Piece | Job |
|---|---|
| `configureStore` | Creates the store, combines slice reducers, adds thunk middleware, enables Redux DevTools and dev-only checks for mutation and non-serializable values |
| `createSlice` | One "feature" of state: `name`, `initialState`, `reducers`. Auto-generates action types and creators. Uses Immer so you can write "mutating" code safely |
| `extraReducers` | Lets a slice respond to actions it did not define (thunk lifecycle, other slices) |
| `createAsyncThunk` | Dispatches `pending` / `fulfilled` / `rejected` actions around a promise |
| `createEntityAdapter` | Stores collections as `{ ids, entities }` with ready-made CRUD reducers and selectors |
| `createSelector` (Reselect) | Memoized derived data |
| `createApi` (RTK Query) | Declares endpoints; generates hooks with caching, dedupe, invalidation, polling |
| `createListenerMiddleware` | Side effects that react to actions (lighter alternative to sagas) |

### Data flow

```text
  Component --dispatch(action)--> Store
                                    |
                     middleware (thunk, RTK Query, listeners)
                                    |
                                 reducers (slices, Immer)
                                    |
                               new state tree
                                    |
  Component <--useSelector(selector)-- re-render only if selected value changed
```

### Folder structure most teams use

```text
src/
  app/store.js
  features/
    cart/cartSlice.js
    auth/authSlice.js
  services/api.js        <- RTK Query createApi
```

## Example

```jsx
// features/cart/cartSlice.js
import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      state.items.push(action.payload); // Immer turns this into an immutable update
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
  },
});
export const { addItem, removeItem } = cartSlice.actions;
export default cartSlice.reducer;

// app/store.js
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../features/cart/cartSlice";
import { api } from "../services/api";

export const store = configureStore({
  reducer: { cart: cartReducer, [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

// CartButton.jsx
import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../features/cart/cartSlice";

export function CartButton({ product }) {
  const count = useSelector((s) => s.cart.items.length);
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(addItem(product))}>Cart ({count})</button>;
}
```

Wrap the app once with `<Provider store={store}>`.

## Common mistakes

- Returning a new value **and** mutating the draft in the same reducer (Immer throws).
- Storing server data in slices with manual `isLoading` flags when RTK Query would do it.
- Selecting the whole slice (`useSelector((s) => s.cart)`) and re-rendering on every cart change.
- Putting non-serializable values (Promises, class instances, DOM nodes) in the store.

## Follow-up questions

- **Is Redux still needed with RTK Query?** RTK Query handles server state; you still need slices only for real client state like UI preferences or a cart.
- **What middleware does configureStore add by default?** Thunk, plus dev-only immutability and serializability checks.
- **How do you type RTK with TypeScript?** Export `RootState = ReturnType<typeof store.getState>` and `AppDispatch = typeof store.dispatch`, then create typed `useAppSelector`/`useAppDispatch` hooks.

## Quick recap

- Same Redux flow: dispatch, reducer, new state, selector.
- `configureStore` + `createSlice` remove most boilerplate.
- Immer lets reducers look mutable while staying immutable.
- RTK Query owns server state; slices own client state.
