---
title: "Why do we need Redux?"
tags: ["redux", "state-management", "prop-drilling"]
difficulty: "easy"
---

## Short answer

We need Redux when many components across the tree read and update the same client state, and passing props or juggling multiple Contexts becomes hard to follow. Redux centralizes that state, makes every change an explicit action handled by pure reducers, lets components subscribe to just the slice they need, and gives excellent debugging (action log, time travel). We do **not** need it for small apps or for server data, which a query cache handles better.

## Explanation

Without Redux, shared state in a large app is like a group of friends planning a trip over separate private chats: everyone has a slightly different version of the plan. Redux is the single shared itinerary that only changes through announced updates everyone can see.

### Problems Redux solves

| Problem | How Redux helps |
|---|---|
| Prop drilling through many layers | Any component reads from the store directly |
| Sibling components need the same data | One source of truth, no syncing via effects |
| "Who changed this value?" | Every change is a named action visible in DevTools |
| Complex update logic scattered in components | Logic lives in pure, unit-testable reducers |
| Too many re-renders from Context | `useSelector` re-renders only when the selected value changes |
| Cross-cutting side effects (logging, analytics, auth refresh) | Middleware |
| Hard-to-reproduce bugs | Action replay and time-travel debugging |

### When you do not need it

- The app is small and state is mostly local.
- Shared state is just theme/locale/user: Context is fine.
- Most "global state" is API data: use RTK Query or TanStack Query.
- You want minimal setup: Zustand or Jotai may be enough.

> **💡 Interview tip:** Interviewers like a balanced answer. Say what Redux is good for, then say "but I would not add it just to share a theme or cache API responses."

## Example

```jsx
// Without Redux: cart count drilled through 3 layers
import { useState } from "react";

function App() {
  const [cart, setCart] = useState([]);
  return <Layout cart={cart} setCart={setCart} />;
}
function Layout({ cart, setCart }) {
  return <Header cart={cart} />; // Layout does not use cart; just passes it
}
```

```jsx
// With Redux: each component reads exactly what it needs
import { useSelector, useDispatch } from "react-redux";
import { itemAdded } from "./cartSlice";

function CartIcon() {
  const count = useSelector((s) => s.cart.items.length);
  return <span>Cart ({count})</span>;
}

function AddButton({ product }) {
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(itemAdded(product))}>Add</button>;
}
```

## Common mistakes

- Adding Redux to every project by default.
- Storing API data in Redux with handwritten loading/error flags instead of RTK Query.
- Assuming Redux makes the app faster automatically; poorly written selectors can make it slower.
- Treating Redux as a replacement for component state.

## Follow-up questions

- **What are the downsides of Redux?** More concepts and setup, indirection between action and effect, and boilerplate (much reduced by RTK).
- **How do you decide between Redux and Context?** Context for rarely-changing values with few consumers; Redux for large, frequently-updated state needing selective subscriptions and tooling.
- **Can Redux and React Query coexist?** Yes; a common setup is the query library for server state and Redux for client state.

## Quick recap

- Redux centralizes shared client state.
- Changes are explicit, traceable actions.
- Selective subscriptions limit re-renders.
- Skip it for small apps and server data.
