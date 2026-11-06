---
title: "What are the key differences between Redux and Context API?"
tags: ["redux", "context", "state-management"]
difficulty: "medium"
---

## Short answer

Context API is a built-in **dependency injection** mechanism: it passes a value down the tree without prop drilling, but it is not a state manager by itself and every consumer re-renders when the value changes. Redux (today, **Redux Toolkit**) is a full state-management library with a single store, reducers, middleware, selector-based subscriptions that limit re-renders, and excellent DevTools. Use Context for low-frequency, app-wide values; use Redux for large, frequently updated, shared client state.

## Explanation

Context is like a building's intercom: one announcement reaches every flat that is listening. Redux is like a bank with a ledger: every change goes through a defined process (actions and reducers), is logged, and each customer only gets notified about their own account (selectors).

| Aspect | Context API | Redux Toolkit |
|--------|-------------|---------------|
| What it is | Transport for a value | Predictable state container |
| Setup | Built in, minimal | Extra package, `configureStore`, slices |
| Updates | You pair it with `useState`/`useReducer` | Reducers handle dispatched actions |
| Re-renders | All consumers of the context re-render on value change | Only components whose selected slice changed |
| Middleware / side effects | None | Thunks, listeners, RTK Query |
| DevTools | React DevTools only | Time-travel, action log |
| Best for | Theme, locale, auth user, feature flags | Complex, frequently changing shared state |
| Boilerplate | Low | Low with RTK (was high in classic Redux) |

### Choosing

- Small to medium app with a few global values: Context + `useReducer`.
- Many features reading and writing shared state, need for debugging and middleware: Redux Toolkit (or a lighter store like Zustand).
- Server data (API responses): neither; use RTK Query or TanStack Query.

> **💡 Interview tip:** Say "Context is not a state management tool, it is a way to avoid prop drilling. The state lives in `useState`/`useReducer`." That line shows you understand the distinction.

## Example

```jsx
// Context + useReducer
import { createContext, useContext, useReducer } from "react";

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case "add":
      return [...state, action.item];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  return <CartContext value={{ items, dispatch }}>{children}</CartContext>;
}

export const useCart = () => useContext(CartContext);
```

```jsx
// Redux Toolkit
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { useSelector } from "react-redux";

const cartSlice = createSlice({
  name: "cart",
  initialState: [],
  reducers: {
    add: (state, action) => {
      state.push(action.payload); // Immer makes this immutable
    },
  },
});

export const { add } = cartSlice.actions;
export const store = configureStore({ reducer: { cart: cartSlice.reducer } });

function CartCount() {
  const count = useSelector((s) => s.cart.length); // re-renders only when length changes
  return <span>{count}</span>;
}
```

## Common mistakes

- Putting rapidly changing state (form input, mouse position) in a top-level context, re-rendering the whole tree.
- Passing a new object literal as the context value on every render without memoising it.
- Using Redux for server cache data instead of RTK Query or TanStack Query.
- Describing Redux with classic boilerplate (switch statements, action constants) instead of Redux Toolkit.

## Follow-up questions

- **How do you reduce Context re-renders?** Split contexts by concern, separate state and dispatch contexts, memoise the value, or use a selector-based store.
- **Can Context replace Redux?** For simple global state, yes. It lacks middleware, selective subscriptions and devtools for complex cases.
- **What is `<Context value>` vs `<Context.Provider>`?** React 19 lets you render the context directly as a provider; `.Provider` still works.

## Quick recap

- Context passes values; Redux manages state.
- Context consumers all re-render; Redux selectors are granular.
- Redux Toolkit removes most old boilerplate.
- Use a query library for server state.
