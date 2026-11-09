---
title: "What is Redux?"
tags: ["redux", "fundamentals", "state-management"]
difficulty: "easy"
---

## Short answer

Redux is a predictable state container for JavaScript apps. All shared state lives in a single **store**; the only way to change it is to **dispatch an action** (a plain object describing what happened), and **reducers** (pure functions) compute the next state from the current state and the action. React components read state with selectors and re-render when the parts they use change. Today Redux is written with **Redux Toolkit** and the `react-redux` hooks.

## Explanation

Redux is like a bank ledger. You never erase a balance; you add a transaction record ("deposited 500"), and the balance is always the result of applying every transaction in order. That makes it easy to audit, replay and debug.

### Three principles

| Principle | Meaning |
|---|---|
| Single source of truth | The global state of the app lives in one store object |
| State is read-only | You change it only by dispatching actions |
| Changes are made with pure functions | Reducers take `(state, action)` and return new state without side effects or mutation |

### Core vocabulary

- **Action**: `{ type: "cart/itemAdded", payload: { id: 7 } }`.
- **Reducer**: `(state, action) => newState`.
- **Store**: holds state; exposes `getState`, `dispatch`, `subscribe`.
- **Selector**: function that reads a piece of state, `state => state.cart.items`.
- **Middleware**: wraps `dispatch` for logging, async (thunks), analytics.

### One-way data flow

```text
UI event -> dispatch(action) -> middleware -> reducer(state, action) -> new state
   ^                                                                       |
   +----------------- useSelector re-renders subscribed components <-------+
```

Redux is framework-agnostic; `react-redux` is the official binding for React.

## Example

```jsx
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    incremented(state) {
      state.value += 1;
    },
    amountAdded(state, action) {
      state.value += action.payload;
    },
  },
});

const { incremented, amountAdded } = counterSlice.actions;
const store = configureStore({ reducer: { counter: counterSlice.reducer } });

function Counter() {
  const value = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();
  return (
    <>
      <p>{value}</p>
      <button onClick={() => dispatch(incremented())}>+1</button>
      <button onClick={() => dispatch(amountAdded(5))}>+5</button>
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}
```

## Common mistakes

- Thinking Redux is part of React; it is a separate library with a binding.
- Mutating state in a hand-written reducer (outside Immer), which breaks change detection.
- Performing API calls or `Math.random()` inside reducers.
- Putting all state, including local form fields, into Redux.

## Follow-up questions

- **Is Redux still relevant?** Yes for large apps with complex shared client state and teams that value DevTools and conventions; smaller apps often use Context, Zustand or a query library instead.
- **What makes Redux predictable?** Pure reducers and serializable actions: the same actions in the same order always produce the same state, enabling time-travel debugging.
- **Can you have multiple stores?** Technically yes, but the convention is one store split into slices.

## Quick recap

- One store, read-only state, pure reducers.
- Dispatch actions to change state.
- Components subscribe with selectors.
- Use Redux Toolkit and hooks for modern code.
