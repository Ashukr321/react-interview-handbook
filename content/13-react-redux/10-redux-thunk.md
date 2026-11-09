---
title: "Concept of Redux Thunk"
tags: ["redux", "thunk", "middleware", "async", "createAsyncThunk"]
difficulty: "medium"
---

## Short answer

Redux Thunk is a middleware that lets you dispatch a **function** instead of a plain action object. The middleware calls that function with `dispatch` and `getState`, so you can run async code (API calls, timers) and dispatch real actions when it finishes. Reducers stay pure and synchronous. Thunk is included by default in Redux Toolkit's `configureStore`, and `createAsyncThunk` generates the `pending`/`fulfilled`/`rejected` actions for you.

## Explanation

A "thunk" is a function that delays work. Reducers are like a cashier who can only process completed receipts. A thunk is the errand runner: it goes out, waits for the supplier (API), and comes back with receipts (actions) the cashier can process.

### How the middleware works

```js
// The entire idea of redux-thunk, simplified
const thunk = ({ dispatch, getState }) => (next) => (action) =>
  typeof action === "function" ? action(dispatch, getState) : next(action);
```

### Flow

```text
dispatch(fetchUser(42))         <- a function, not an object
   -> thunk middleware sees a function, calls it
      -> dispatch({ type: "user/fetch/pending" })
      -> await fetch("/api/users/42")
      -> dispatch({ type: "user/fetch/fulfilled", payload })
         or dispatch({ type: "user/fetch/rejected", error })
   -> reducers update status and data
```

### createAsyncThunk

| Feature | What you get |
|---|---|
| Lifecycle actions | `pending`, `fulfilled`, `rejected` with typed payloads |
| `thunkAPI` | `dispatch`, `getState`, `signal` (AbortController), `rejectWithValue` |
| `condition` option | Skip the request if data is already loading/cached |
| `.unwrap()` | Returns a promise that resolves with the payload or throws, handy in components |

### When to use thunks vs alternatives

- **Thunks**: simple async logic, sequential calls, conditional dispatch.
- **RTK Query**: fetching and caching server data; prefer this over hand-written fetch thunks.
- **Listener middleware / sagas**: reacting to actions, debouncing, complex workflows.

## Example

```jsx
// usersSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchUser = createAsyncThunk(
  "users/fetchById",
  async (id, { signal, rejectWithValue }) => {
    const res = await fetch(`/api/users/${id}`, { signal });
    if (!res.ok) return rejectWithValue(`Error ${res.status}`);
    return res.json();
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState: { entity: null, status: "idle", error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.status = "loading"; state.error = null; })
      .addCase(fetchUser.fulfilled, (state, action) => { state.status = "succeeded"; state.entity = action.payload; })
      .addCase(fetchUser.rejected, (state, action) => { state.status = "failed"; state.error = action.payload ?? action.error.message; });
  },
});
export default usersSlice.reducer;
```

```jsx
// UserProfile.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "./usersSlice";

export function UserProfile({ id }) {
  const dispatch = useDispatch();
  const { entity, status, error } = useSelector((s) => s.users);

  useEffect(() => {
    const promise = dispatch(fetchUser(id));
    return () => promise.abort(); // cancel on unmount or id change
  }, [id, dispatch]);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "failed") return <p>{error}</p>;
  return <h2>{entity?.name}</h2>;
}
```

A hand-written thunk without `createAsyncThunk`:

```js
export const addToCartIfInStock = (productId) => async (dispatch, getState) => {
  if (getState().cart.items.some((i) => i.id === productId)) return;
  const { inStock } = await fetch(`/api/stock/${productId}`).then((r) => r.json());
  if (inStock) dispatch({ type: "cart/itemAdded", payload: { id: productId } });
};
```

## Common mistakes

- Putting API calls in reducers or components instead of thunks.
- Not handling `rejected`, leaving the UI stuck in loading.
- Racing requests: an older response overwriting a newer one; use `signal`/`abort` or check the `requestId`.
- Writing fetch thunks for every endpoint when RTK Query would remove the code.

## Follow-up questions

- **Thunk vs saga?** Thunks are simple functions with async/await and minimal setup; sagas use generators for complex, cancellable, event-driven flows and are easier to test step by step.
- **What does `unwrap()` do?** It turns the dispatched thunk's result into a promise that resolves with the payload or rejects with the error, so you can `try/catch` in a component.
- **Can a thunk return a value?** Yes; `dispatch(thunk)` returns whatever the thunk returns, usually a promise.

## Quick recap

- Thunk middleware lets `dispatch` accept functions.
- The function gets `dispatch` and `getState` and can run async code.
- `createAsyncThunk` generates lifecycle actions.
- Included by default in `configureStore`; prefer RTK Query for data fetching.
