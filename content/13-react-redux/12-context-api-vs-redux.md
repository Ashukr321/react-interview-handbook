---
title: "What is Context API? How is it different from Redux?"
tags: ["context", "redux", "prop-drilling", "comparison"]
difficulty: "medium"
---

## Short answer

The Context API is React's built-in way to pass data through the component tree without manually passing props at every level. You create a context with `createContext`, provide a value with a Provider, and read it with `useContext` (or `use` in React 19). It is a **dependency-injection** tool, not a state manager: the state still lives in `useState`/`useReducer`, and every consumer re-renders when the value changes. Redux is a full state management library with a central store, actions, pure reducers, selector-based subscriptions, middleware and DevTools.

## Explanation

Context is like a building's intercom: set the message at the source and any apartment can listen without passing notes from door to door. Redux is a central records office with request forms, rules for updates, and a log of every change.

### How Context works

```text
createContext(default)
      |
<ThemeContext value={theme}>        <- provider holds value
   <Layout>                         <- does not need theme prop
      <Sidebar>
         <Button />  useContext(ThemeContext)  <- reads directly
```

- Consumers get the value from the **nearest** provider above them, or the default if none.
- When the provider's `value` changes (by reference), all consumers re-render.
- React 19 lets you render `<ThemeContext>` directly as the provider and read it with `use(ThemeContext)`, even conditionally.

### Context vs Redux

| Aspect | Context API | Redux (with RTK) |
|---|---|---|
| Purpose | Avoid prop drilling | Manage and update global state predictably |
| Built into React | Yes | No, separate library |
| State storage | Your `useState`/`useReducer` in a provider | One central store |
| Update mechanism | Call setter / dispatch from provider | Dispatch actions to pure reducers |
| Re-render scope | All consumers of that context | Only components whose selected value changed |
| Middleware / async | None | Thunks, listeners, sagas, RTK Query |
| DevTools | React DevTools | Redux DevTools with time travel |
| Best for | Theme, locale, auth user, compound components | Large, frequently changing shared state |

### Can Context replace Redux?

For small and medium apps, `useReducer` + Context covers a lot. As the app grows you start rebuilding Redux features (selectors to limit re-renders, middleware, debugging). Note that `react-redux` itself uses Context only to pass the store reference, not the state.

## Example

```jsx
import { createContext, useContext, useMemo, useState } from "react";

const LocaleContext = createContext({ locale: "en", setLocale: () => {} });

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState("en");
  const value = useMemo(() => ({ locale, setLocale }), [locale]); // stable unless locale changes
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function LanguagePicker() {
  const { locale, setLocale } = useContext(LocaleContext);
  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="hi">Hindi</option>
    </select>
  );
}

export function Greeting() {
  const { locale } = useContext(LocaleContext);
  return <h1>{locale === "hi" ? "Namaste" : "Hello"}</h1>;
}
```

The Redux version of shared state would use a slice and `useSelector((s) => s.locale.value)`, where only components whose selected value changed re-render.

## Common mistakes

- Calling Context a state management library.
- One huge Context for unrelated data, causing app-wide re-renders.
- Passing `value={{ ... }}` inline without memoization.
- Expecting `React.memo` to stop re-renders of components that consume the context.

## Follow-up questions

- **What happens if there is no Provider?** `useContext` returns the default value passed to `createContext`.
- **How do you optimize Context?** Split contexts by concern, memoize the value, separate state and dispatch contexts, and keep fast-changing data elsewhere.
- **When do you pick Redux over Context?** Frequent updates read by many components, complex update logic, need for middleware or debugging tools.

## Quick recap

- Context passes values down without prop drilling.
- State still lives in hooks; Context only transports it.
- All consumers re-render on value change.
- Redux adds a store, reducers, selectors, middleware and DevTools.
