---
title: "What smaller API improvements came with React 19?"
tags: ["react-19", "context", "refs", "usedeferredvalue", "custom-elements"]
difficulty: "easy"
asked_as: ["How do you render a Context provider in React 19?", "What is a ref cleanup function?", "What is the initialValue of useDeferredValue?"]
---

## Short answer

React 19 also simplified several everyday APIs: **`<Context value>`** works directly as a provider (no `.Provider`), **`ref` is a normal prop** for function components, **callback refs can return a cleanup function**, **`useDeferredValue` accepts an `initialValue`**, **custom elements (Web Components)** get full property and event support, and **hydration errors** show one clear diff instead of many vague warnings. React 19.3 added support for rendering `<Context>` directly in Server Components.

## Explanation

| Improvement | Before | React 19 |
| --- | --- | --- |
| Context provider | `<ThemeContext.Provider value="dark">` | `<ThemeContext value="dark">` |
| Ref on function component | Needed `forwardRef` | `function Input({ ref }) {...}` |
| Ref cleanup | React called the callback with `null` on unmount | Return a cleanup function from the callback ref |
| Deferred value on first render | Always the real value | `useDeferredValue(value, initialValue)` renders `initialValue` first, then updates in the background |
| Custom elements | Props passed as string attributes only | Properties set correctly on the client, events supported |
| Hydration mismatch | Several confusing warnings | One error with a diff of what differs |
| Error reporting | Errors logged twice; re-thrown | Logged once; `createRoot` options `onCaughtError`, `onUncaughtError`, `onRecoverableError` |

`<Context.Provider>` still works but is planned for deprecation.

## Example

```jsx
import { createContext, useDeferredValue } from "react";

const ThemeContext = createContext("light");

export function App({ children }) {
  return <ThemeContext value="dark">{children}</ThemeContext>;
}

// Ref cleanup: no more checking for null
function AutoResizeTextarea() {
  return (
    <textarea
      ref={(node) => {
        const observer = new ResizeObserver(() => fitHeight(node));
        observer.observe(node);
        return () => observer.disconnect(); // runs when the node is removed
      }}
    />
  );
}

// initialValue: show something cheap first, then the real results
function Search({ query }) {
  const deferredQuery = useDeferredValue(query, "");
  return <Results query={deferredQuery} />;
}
```

## Common mistakes

- In TypeScript, writing a callback ref with an implicit return like `ref={(n) => (instance = n)}`. React 19 treats the returned value as a cleanup function, so TypeScript now rejects it. Use a block body: `ref={(n) => { instance = n; }}`.
- Assuming `.Provider` stopped working. It still works; the new form is just simpler.
- Using `initialValue` with an expensive value. The point is to render something cheap first.

## Follow-up questions

- **Why does a returned ref cleanup matter?** It gives refs the same setup/cleanup model as effects, which is cleaner for observers and listeners attached to a node.
- **Where does `onCaughtError` help?** It sends errors caught by error boundaries to your monitoring tool in one place.
- **How do you migrate `.Provider` usage?** React provides a codemod, but there's no rush; both forms work.

## Quick recap

- `<Context value>` replaces `<Context.Provider>`.
- `ref` is a prop, and callback refs can return a cleanup function.
- `useDeferredValue(value, initialValue)` renders cheap content first.
- Better custom element support, clearer hydration errors, single error logs.
