---
title: "Concept of Connect and Provider: how to connect React with Redux"
asked_as: ["How to connect React with Redux?"]
tags: ["react-redux", "provider", "connect", "hooks"]
difficulty: "medium"
---

## Short answer

React and Redux are connected through the `react-redux` library. `<Provider store={store}>` wraps the app once and makes the store available to every component via React Context. Components then read state and dispatch actions either with the **hooks API** (`useSelector`, `useDispatch`), which is the modern default, or with the older **`connect()`** higher-order component, which maps state and dispatch to props via `mapStateToProps` and `mapDispatchToProps`.

## Explanation

`Provider` is like the building's power grid: install it once at the main panel and every room can plug in. `connect` and `useSelector` are the sockets each component plugs into, drawing only the current it needs.

### Steps to connect React with Redux

1. Install: `npm install @reduxjs/toolkit react-redux`.
2. Create slices and the store with `configureStore`.
3. Wrap the root with `<Provider store={store}>`.
4. In components, read with `useSelector` and update with `useDispatch` (or wrap with `connect`).

```text
<Provider store>          (passes store through Context)
   |
   +-- <Header />  useSelector(s => s.user.name)
   +-- <Cart />    connect(mapState, mapDispatch)(Cart)
```

### Provider

- Takes a `store` prop and puts it in Context; it does not re-render the tree on every state change.
- Components subscribe individually, so only those whose selected data changed re-render.

### connect vs hooks

| | `connect()` HOC | Hooks (`useSelector`, `useDispatch`) |
|---|---|---|
| Style | Wraps a component, injects props | Called inside a function component |
| Works with class components | Yes | No |
| Built-in memoization | Wrapped component behaves like `React.memo` | Use `React.memo` yourself if needed |
| Boilerplate | `mapStateToProps`, `mapDispatchToProps` | Minimal |
| TypeScript | Verbose (`ConnectedProps`) | Simple typed hooks |
| Recommendation | Legacy code, class components | Default for new code |

## Example

```jsx
// main.jsx
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

```jsx
// Hooks style (recommended)
import { useSelector, useDispatch } from "react-redux";
import { incremented } from "./counterSlice";

export function Counter() {
  const value = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(incremented())}>Count: {value}</button>;
}
```

```jsx
// connect style (legacy, still common in older codebases)
import { connect } from "react-redux";
import { incremented } from "./counterSlice";

function CounterView({ value, increment }) {
  return <button onClick={increment}>Count: {value}</button>;
}

const mapStateToProps = (state) => ({ value: state.counter.value });
const mapDispatchToProps = { increment: incremented }; // object shorthand

export default connect(mapStateToProps, mapDispatchToProps)(CounterView);
```

## Common mistakes

- Forgetting `Provider`, which throws "could not find react-redux context value".
- Creating the store inside a component, so it is recreated on re-render (in Next.js, create it per request with `useRef` in a client provider).
- Selecting the entire state in `useSelector` or `mapStateToProps`, causing re-renders on every action.
- Assuming `Provider` re-renders the whole app on state change.

## Follow-up questions

- **How does useSelector decide to re-render?** It runs the selector after each dispatch and compares the result with the previous one using `===` (or a custom equality like `shallowEqual`).
- **Can you have multiple Providers?** Yes, with custom contexts, but one store and one Provider is the norm.
- **How do you use Redux with Next.js App Router?** Create a client component `StoreProvider` that makes a store per request with `useRef`, and wrap the layout's children with it.

## Quick recap

- `Provider` makes the store available via Context.
- Hooks (`useSelector`, `useDispatch`) are the modern way to connect.
- `connect` maps state and dispatch to props; still seen in legacy code.
- Components subscribe individually and re-render only when their selection changes.
