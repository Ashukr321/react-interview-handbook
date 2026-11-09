---
title: "What is Reducer?"
tags: ["redux", "reducer", "pure-functions", "immutability"]
difficulty: "easy"
---

## Short answer

A reducer is a **pure function** `(state, action) => newState` that decides how state changes in response to an action. It must not mutate its arguments, perform side effects (API calls, timers, randomness) or depend on anything outside its inputs. If the action is not relevant, it returns the existing state unchanged. In Redux Toolkit, `createSlice` generates reducers, and Immer lets you write updates that look like mutations.

## Explanation

The name comes from `Array.prototype.reduce`: a reducer folds a sequence of actions into a single state, the same way `reduce` folds an array into a value.

```js
const finalState = actions.reduce(reducer, initialState);
```

Analogy: a calculator. Given the current display (state) and a button press (action), it always shows the same result. It does not phone anyone or roll dice.

### Rules of a reducer

| Rule | Why |
|---|---|
| Same input gives same output | Enables replay, time travel, testing |
| No mutation of `state` or `action` | Change detection relies on new references |
| No side effects | Async/logging belongs in middleware |
| Return current state for unknown actions | Every reducer sees every action |
| Provide an initial state | First call receives `undefined` state |

### Classic vs Redux Toolkit reducer

- **Classic**: `switch (action.type)` with spread-based immutable updates.
- **RTK**: `createSlice` with case reducers; Immer converts draft mutations into immutable updates. You may either mutate the draft or return a new value, not both.

### Reducers in React itself

`useReducer(reducer, initialState)` uses the same idea for component-local state, without a store.

## Example

```js
// Classic reducer
const initialState = { items: [], total: 0 };

export function cartReducer(state = initialState, action) {
  switch (action.type) {
    case "cart/itemAdded": {
      const item = action.payload;
      return {
        ...state,
        items: [...state.items, item],
        total: state.total + item.price,
      };
    }
    case "cart/cleared":
      return initialState;
    default:
      return state; // unrelated action: same reference
  }
}
```

```js
// Same logic with Redux Toolkit
import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: [], total: 0 },
  reducers: {
    itemAdded(state, action) {
      state.items.push(action.payload);
      state.total += action.payload.price;
    },
    cleared() {
      return { items: [], total: 0 };
    },
  },
});

export const { itemAdded, cleared } = cartSlice.actions;
export default cartSlice.reducer;
```

```jsx
// useReducer with the classic reducer
import { useReducer } from "react";

export function MiniCart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  return (
    <button onClick={() => dispatch({ type: "cart/itemAdded", payload: { id: 1, price: 99 } })}>
      Items: {state.items.length}, Total: {state.total}
    </button>
  );
}
```

## Common mistakes

- `state.items.push(x); return state;` in a classic reducer: mutation with the same reference, so the UI does not update.
- Generating ids with `Date.now()` or `crypto.randomUUID()` inside the reducer; do it in the action creator (`prepare`).
- Calling APIs or dispatching from a reducer.
- Forgetting the `default` case, which returns `undefined` and wipes state.

## Follow-up questions

- **Why can't reducers be async?** The store needs the next state synchronously; async work goes in thunks or other middleware that dispatch actions later.
- **Can two reducers handle the same action?** Yes; every slice reducer sees every action, which is how cross-slice reactions (like reset on logout) work.
- **How do you test a reducer?** Call it with a state and an action and assert on the returned state; no mocks needed.

## Quick recap

- Reducer: pure `(state, action) => newState`.
- No mutation, no side effects, return state for unknown actions.
- `createSlice` + Immer simplifies writing them.
- `useReducer` uses the same pattern locally.
