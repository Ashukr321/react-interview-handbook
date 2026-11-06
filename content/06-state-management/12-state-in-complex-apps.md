---
title: "How do you manage state in a complex React application?"
asked_as: ["How do you manage state in a complex app to avoid unnecessary re-renders?", "Patterns for global state: Redux Toolkit."]
tags: ["state", "architecture", "redux-toolkit", "performance"]
difficulty: "hard"
---

## Short answer

I split state by kind and give each kind the right tool: **server state** in RTK Query or TanStack Query, **URL state** in the router, **form state** in React Hook Form, **local UI state** colocated with `useState`, and only true **global client state** (auth, cart, preferences, cross-feature workflows) in Redux Toolkit organized as feature slices. To avoid unnecessary re-renders, components subscribe through narrow, memoized selectors, data is normalized, Contexts are small and split, and fast-changing values stay local.

## Explanation

A large app is like a city. Not everything belongs in city hall. Houses keep their own furniture (local state), neighborhoods share parks (lifted state), the city keeps records everyone needs (global store), and supplies come from warehouses with their own inventory systems (server cache).

### Layered state architecture

```text
+-----------------------------------------------------------+
| Server state   RTK Query / TanStack Query (cache, refetch) |
+-----------------------------------------------------------+
| Global client  Redux Toolkit slices: auth, cart, ui prefs  |
+-----------------------------------------------------------+
| URL state      route params, search params                 |
+-----------------------------------------------------------+
| Feature/shared lifted state, small Contexts                |
+-----------------------------------------------------------+
| Local state    useState / useReducer in the component      |
+-----------------------------------------------------------+
```

### Redux Toolkit patterns for global state

- **Feature folders**: `features/cart/cartSlice.js`, selectors and components together.
- **Slices own their data**; cross-slice reactions go in `extraReducers` or listener middleware, not by reaching into other slices.
- **Normalize collections** with `createEntityAdapter`.
- **Selectors as the public API**: components never read `state.x.y.z` directly; use `selectCartTotal` so the shape can change.
- **Memoize derived data** with `createSelector`.
- **Typed hooks** (`useAppSelector`, `useAppDispatch`) in TypeScript.
- **Side effects** in thunks or `createListenerMiddleware`; keep reducers pure.

### Avoiding unnecessary re-renders

| Technique | Why it helps |
|---|---|
| Colocate state | Updates stay in a small subtree |
| Narrow selectors (return primitives or ids) | `useSelector` re-renders only when the result changes |
| `createSelector` for derived arrays/objects | Avoids returning new references every time |
| Normalized entities | Updating one item keeps other references stable |
| Split Contexts by update frequency | Fast changes do not notify slow consumers |
| `React.memo` + stable callbacks / React Compiler | Skips children whose props did not change |
| `useTransition` / `useDeferredValue` | Keeps typing responsive while heavy UI updates |
| Virtualize long lists | Fewer components exist to re-render |

## Example

```jsx
// features/cart/cartSlice.js
import { createSlice, createSelector } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: {} }, // { [productId]: { price, qty } }
  reducers: {
    addToCart(state, { payload }) {
      const item = state.items[payload.id];
      if (item) item.qty += 1;
      else state.items[payload.id] = { price: payload.price, qty: 1 };
    },
  },
});

export const { addToCart } = cartSlice.actions;
export default cartSlice.reducer;

const selectItems = (s) => s.cart.items;
export const selectCartTotal = createSelector([selectItems], (items) =>
  Object.values(items).reduce((sum, i) => sum + i.price * i.qty, 0)
);
export const selectQty = (s, id) => s.cart.items[id]?.qty ?? 0;
```

```jsx
// Components subscribe to exactly what they display
import { useSelector } from "react-redux";
import { selectCartTotal, selectQty } from "./cartSlice";

export function CartTotal() {
  const total = useSelector(selectCartTotal); // a number: re-renders only when it changes
  return <strong>₹{total}</strong>;
}

export function QtyBadge({ productId }) {
  const qty = useSelector((s) => selectQty(s, productId));
  return qty > 0 ? <span>{qty}</span> : null;
}
```

## Common mistakes

- One global store for everything, including server data and input text.
- Selectors that return new objects/arrays each time (`s.items.filter(...)` inline), causing re-renders on every dispatch.
- Deeply nested, denormalized state that makes updates expensive and error-prone.
- Reaching for `React.memo` everywhere before fixing where state lives.

## Follow-up questions

- **How do you share logic between slices?** Respond to the same action in multiple slices via `extraReducers`, or use listener middleware for side effects.
- **How do you handle code splitting with Redux?** In RTK 2, build the root reducer with `combineSlices` and lazily add feature slices with `rootReducer.inject(slice)` when their route loads.
- **When is a state machine (XState) a better fit?** For flows with many explicit states and transitions, such as checkout or upload wizards.

## Quick recap

- Classify state and pick a tool per category.
- RTK for real global client state, organized as feature slices with selectors.
- Server state goes to a query cache.
- Narrow selectors, normalization and colocation prevent wasted renders.
