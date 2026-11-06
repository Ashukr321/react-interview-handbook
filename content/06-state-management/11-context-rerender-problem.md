---
title: "You used Context API but every component is re-rendering. Why?"
tags: ["context", "re-renders", "performance", "scenario"]
difficulty: "medium"
---

## Short answer

Because every component that calls `useContext(SomeContext)` re-renders whenever the provider's `value` changes by reference, even if it only uses one field. The usual culprits are one big Context holding unrelated data, a `value={{ ... }}` object created fresh on every render, and the provider sitting in a component that re-renders often. Fix it by memoizing the value, splitting contexts, separating state from dispatch, and moving fast-changing data to a selector-based store.

## Why it happens

```text
<AppProvider value={{ user, theme, cart, notifications }}>
        |
 notifications update every 5s
        |
 new value object -> Object.is(old, new) === false
        |
 EVERY useContext(AppContext) consumer re-renders
 (Header, ThemeToggle, ProfileCard, CartIcon, ...)
```

1. **No partial subscription.** Context has no selectors. Reading `ctx.theme` still subscribes you to the whole value.
2. **New object each render.** `value={{ user, setUser }}` is a new reference every time the provider component renders, even if nothing changed.
3. **Too much in one Context.** Rarely-changing data (theme) shares a provider with frequently-changing data (notifications).
4. **Provider children re-render too.** If the provider component's state changes and you render children inline instead of through `children` props, the whole subtree re-renders regardless of Context.

`React.memo` does not help consumers: a memoized component that calls `useContext` still re-renders when the context changes.

## How to fix it

1. **Memoize the value** with `useMemo` (and functions with `useCallback`), or let the React Compiler do it.
2. **Split by concern and update frequency**: `AuthContext`, `ThemeContext`, `NotificationsContext`.
3. **Separate state and dispatch** into two contexts; components that only dispatch never re-render on state changes.
4. **Accept `children`** in the provider so its own state changes do not re-render the subtree.
5. **Read context lower** in the tree, in small leaf components.
6. **For high-frequency shared state, use a store** (Redux Toolkit, Zustand, Jotai) or `useSyncExternalStore` with selectors.

```jsx
import { createContext, useContext, useReducer } from "react";

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case "add":
      return { ...state, items: [...state.items, action.item] };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  // state only gets a new reference when the reducer returns a new object
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  return (
    <CartDispatchContext value={dispatch}>{/* dispatch is stable */}
      <CartStateContext value={state}>{children}</CartStateContext>
    </CartDispatchContext>
  );
}

export const useCart = () => useContext(CartStateContext);
export const useCartDispatch = () => useContext(CartDispatchContext);

// Only needs dispatch: never re-renders when items change
export function AddToCartButton({ item }) {
  const dispatch = useCartDispatch();
  return <button onClick={() => dispatch({ type: "add", item })}>Add</button>;
}
```

> **💡 Interview tip:** Mention that `useReducer`'s `dispatch` and `useState`'s setter are guaranteed stable, which is exactly why the dispatch-context split works.

## How to verify

- React DevTools Profiler with "Record why each component rendered": consumers should show "Context changed" only when their context really changed.
- Toggle "Highlight updates" and trigger the update; only the relevant components should flash.
- Check that `AddToCartButton`-style dispatch-only components no longer render on state changes.

## Follow-up questions

- **Why doesn't React.memo stop Context re-renders?** `memo` only compares props; Context updates bypass props and schedule the consumer directly.
- **Is there a context selector API?** Not in stable React; libraries like `use-context-selector` emulate it, or use Zustand/Redux.
- **Does `use(Context)` in React 19 behave differently?** It can be called conditionally, but re-render behavior is the same as `useContext`.

## Quick recap

- Any value change re-renders every consumer.
- Memoize the provider value and split contexts.
- Separate state from dispatch.
- Use a selector-based store for fast-changing shared data.
